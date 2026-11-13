---
title: "A UE5 State Tree Enemy AI With One GAS Attack Ability: Data-Driven Attack Selection for a Melee Grunt"
description: "How PSEUDO's first enemy AI was built in Unreal Engine 5: an AI controller that owns the rules, a small State Tree with thin C++ tasks, attacks described in a data asset and run by one shared server-only gameplay ability, socket-based weapon traces, and why cooldowns live in the controller instead of cooldown effects."
date: 2026-11-15
workedOn: 2026-10-20
publishAt: 2026-11-15
track: "Enemy AI core"
category: "Build Logs"
sidebar: "Enemy AI Core"
image: /blog/pseudo-ai-core-c.jpg
outline: deep
tags: [UE5, AI, State Tree, GAS, Combat]
---

# A UE5 State Tree Enemy AI With One GAS Attack Ability: Data-Driven Attack Selection for a Melee Grunt

This is the build log for the first enemy AI in PSEUDO, a melee grunt copied from Paragon's lane minion. For a base you can reuse across enemy types in Unreal Engine 5, what worked for me was to keep the rules in the AI controller as plain C++ functions and make the State Tree a thin layer of tasks that call them. Every attack is an entry in the enemy's data asset, and all of them run through one server-only gameplay ability that finds its entry by a tag on the ability spec.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-ai-core-c.jpg" alt="One State Tree and one attack ability serve every enemy; the data asset picks the attacks." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-ai-core-c-dark.jpg" alt="One State Tree and one attack ability serve every enemy; the data asset picks the attacks." loading="lazy">
</figure>

The design rules (how an enemy chooses an attack, why weighted random, how bosses extend it) are on the wiki's [Enemies](/wiki/pseudo/systems/enemy-ai) page. This post covers how the first version went into the engine. Perception, suspicious and lost states, attack tokens, strafing and EQS were all left out on purpose and came in later work.

## The controller holds the rules, the tree only sequences them

I used [State Tree](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine) with the `StateTreeAIComponent`, which needs the StateTree and GameplayStateTree plugins plus the AIModule, NavigationSystem and State Tree modules in `Build.cs`.

The split I settled on: `APseudoAIController` runs only on the server and holds every rule as an ordinary function.

- `FindTarget`: the nearest living player within the enemy's `EngageRadius`, set as the focus.
- `IsTargetValid`: the target is alive and still inside `LoseTargetRadius`.
- `SelectAttack`: drops attacks that are on cooldown, too close (`MinRange`) or missing their `RequiredTags`, then picks a weighted random one from what's left. The random stream is seeded (`FRandomStream`), so a test run can be repeated.
- `MoveToSelectedAttackRange`: `MoveToActor` with an acceptance radius of 0.8 × the attack's `MaxRange`. If there's no nav data, it falls back to a direct move.
- `StartSelectedAttack` and `IsAttackRunning`.

The tree tasks are `Find Target`, `Hold Target`, `Select Attack`, `Approach Target` and `Run Attack`, and each one is a thin wrapper over one of those functions. The tasks get the AI controller from the schema context, so the tree has no manual property bindings to keep in sync.

The base tree is small:

```
Root
├─ Idle    (Find Target)
└─ Combat  (Hold Target)
     SelectAttack → Approach → Attack → SelectAttack ...
```

Putting the logic in the controller kept the tree readable and let me reason about the rules in C++. The tree asset is built by an editor-only function (`BuildEnemyBaseStateTree`), and I can rerun it to reset the layout or edit the asset in the State Tree editor afterwards. I needed that helper, plus a second one for creating the asset, because I couldn't set the State Tree factory's schema from Python.

Death goes through a gameplay tag. When `State.Dead` is added, the controller stops movement, cancels abilities and stops the tree. When the tag is removed (a test reset), the tree restarts.

## Everything that differs between enemies lives in one data asset

`UPseudoEnemyData` describes an enemy completely. Each attack is a struct, `FPseudoEnemyAttack`, with these fields: an attack tag, the montage, min and max range, cooldown, weight, required tags, the weapon sockets and trace radius used for hits, a damage multiplier, and the element and element gauge. On top of the attacks, the asset holds the State Tree to run, the engage and lose radii, the attack ability class, and the body: skeletal mesh, anim class, mesh offset, capsule size and `MaxWalkSpeed`.

Since the body is data too, one enemy character Blueprint serves every enemy. The character applies the body from the data in its construction script and again at begin play. `IsDataValid` checks the tags, montages, sockets and ranges, so a broken entry shows up in the editor instead of in a fight.

For the grunt, the asset has three slashes. Each one has a range of 0 to 110 cm, cooldowns of 2.5, 3 and 4 seconds, weights of 1, 1 and 0.5, and traces on both sword sockets with a radius of 45. Its stats come from a row in the shared enemy stats table, which gained an `AttackPower` column for this.

## One attack ability for every attack

The attack ability, `UPseudoGameplayAbility_EnemyAttack`, is server-only. The character grants one spec of it per attack and adds that attack's tag to the spec as a dynamic tag. When the ability activates, it reads its own spec tag, finds the matching entry in the data asset, and plays that montage.

Here I moved away from the design doc, which said to activate attacks with `TryActivateAbilitiesByTag`, but that matches the ability's own tags, not dynamic spec tags. With one shared class, every spec has the same ability tags, so activating by tag can't tell the slashes apart. Instead, the controller keeps a map from attack tag to spec handle and activates by handle.

Hit timing works the same way as the player's melee. An anim notify state on the montage sends `Event.Hit.Window.*` events, and the ability opens and closes a weapon trace between them. It checks that the event's payload is its own montage, it hits players only, and it hits each target once per attack. The trace is the same ability task the player's greatsword uses, which I extended with a socket mode: the greatsword sweeps a blade defined on the weapon, and the grunt sweeps sockets on its own mesh. Damage goes through a shared helper that the player's combo ability now calls too, so both sides use the same damage path. How the player-side sweep works is in [Melee Hit Detection in UE5 With GAS Target Data](./2026-11-14-pseudo-melee-hit-detection-build).

I placed the hit windows on the three montages from the sword bone's speed, so each window opens at the fastest part of the swing and lasts 0.17 to 0.20 s.

## Cooldowns as timestamps, not cooldown effects

I also didn't use cooldown gameplay effects for enemy attacks. Each cooldown is a world-time timestamp stored in the controller. The cooldown is only an input to the AI's choice and nothing else reads it. World time still slows under the game's time-dilation effect, so cooldowns behave the same as effect durations would. If UI or another system ever needs to see an enemy's cooldowns, I'll move them to effects then.

All attack timing comes from montages, anim notifies and those timestamps. There's no `WaitDelay` anywhere in the attack.

## Copying a Paragon minion into the project

The grunt's mesh, skeleton, Physics Asset, materials and 45 melee animations had to be copied out of the external pack folder with every reference remapped to the copies (247 MB). Python couldn't do that, so a small editor library function copies packages with remapped references. The anim Blueprint is minimal: a blend space (direction and speed) into the default slot into the output pose.

## What testing found

I tested on a listen server with one client:

- The player's combo hits registered on the grunt's own Physics Asset bones, and the damage matched the formula with its defense.
- It targeted the nearest living player, approached, and mixed the three slashes by weight with cooldowns.
- It hit both the host and the client player, once per swing.
- When the host died it switched to the client, and when the client died it dropped the target. When the grunt itself died, its brain stopped and later hits on it were rejected.
- On the client, the attack montages played, and no AI controller existed there, as intended.

The first run showed one data problem. The grunt swung from 170 cm while the training dummies blocked its path, so I lowered the range to 110 cm.

Playing against it turned up more. The nav mesh had never been built, because my rebuild command ran without a world, so every move used the straight-line fallback. Rebuilding and saving it fixed that. The camera snapping forward and the grunt not facing its target got their own post, [a spring arm that jerked the camera and an AI controller with tick off](./2026-10-20-pseudo-first-enemy-camera-and-facing). A later bug, where the grunt's swings only landed while the host was looking at it, is in [Hits That Only Landed When the Host Was Watching](./2026-10-20-pseudo-offscreen-enemy-hits).

## Where this first version stopped

- The three attacks chain almost back to back, because each has its own cooldown. It needs a recovery gap or tuned cooldowns.
- No hit reactions yet, and dead enemies stay standing.
- The grunt can't path around other pawns, so the dummies blocked it.

If you're building something similar, the parts I'd copy are the controller-owned rules, one ability with a spec per attack activated by handle, and a validated data asset that includes the body.
