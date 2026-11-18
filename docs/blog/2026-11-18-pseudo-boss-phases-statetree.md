---
title: "A UE5 Boss With Data Phases and a State Tree: Super-Armor Enrage, Authored Attack Patterns, a Linked Combat Loop and a Server-Judged Thrown Rock"
description: "How I built a two-phase boss in Unreal Engine 5 with GAS and State Tree: HP-threshold phases judged once on the server in C++, an uninterruptible enrage that pauses the AI, attack patterns as weighted State Tree children with cooldowns, a shared combat loop linked in as an asset, a replicated projectile that only the server judges, and a defense-type indicator cue."
date: 2026-11-18
workedOn: 2026-10-21
publishAt: 2026-11-18
track: "Boss Rampage"
category: "Build Logs"
sidebar: "Boss Phases and Patterns"
image: /blog/pseudo-boss-phase-c.jpg
outline: deep
tags: [UE5, GAS, AI, StateTree, Multiplayer, C++]
---

# A UE5 Boss With Data Phases and a State Tree: Super-Armor Enrage, Authored Attack Patterns, a Linked Combat Loop and a Server-Judged Thrown Rock

This build log is about turning an ordinary enemy setup into a boss: Rampage, a heavy brute with two phases, set attack sequences, a thrown rock and a shield you break by destroying its arms or back. For anyone building bosses with State Tree, the short version: keep health checks out of the tree. Put phase changes in a small server-side C++ component driven by data, let it set a tag, and keep the tree for what it's good at, choosing and sequencing behavior, with the phase tag as just another condition.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-boss-phase-c.jpg" alt="HP phases are judged in C++ and set a tag; the State Tree only reads the tag and runs patterns." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-boss-phase-c-dark.jpg" alt="HP phases are judged in C++ and set a tag; the State Tree only reads the tag and runs patterns." loading="lazy">
</figure>

The boss as a player meets it (patterns, numbers, what the first playtest found) is on the wiki's [Rampage page](/wiki/pseudo/systems/rampage), and the general AI setup is on [Enemies and AI](/wiki/pseudo/systems/enemy-ai). It builds on four earlier pieces: the [State Tree enemy AI](./2026-11-15-pseudo-enemy-ai-statetree-core), [reactions and groggy](./2026-11-17-pseudo-hit-reactions-groggy-break-fall), [area attacks](./2026-11-18-pseudo-aoe-attacks-server-validated) and [breakable parts](./2026-11-18-pseudo-breakable-parts-shield).

## Two layers: data phases for every enemy, a tree for bosses only

I split the boss into two layers.

**Data phases** work for any enemy, and a mid-boss uses only this layer. The enemy data asset lists phases. Each has an HP threshold, the tag it grants (`State.Phase.2`), a buff gameplay effect, a montage play rate, an enter montage, and a shield mode. A phase component on the enemy listens to the health attribute on the server and judges thresholds once.

**The boss tree** (`ST_Boss_<Name>`) exists only for bosses. It reads the phase tag, runs authored patterns, and handles shield regeneration. It never looks at HP.

Why not let the tree check "HP below 50%" in a transition? Because a phase change has stricter needs than a behavior choice. The enrage has to start immediately, cancel whatever attack is running, and not be interrupted by anything. A tree transition only happens when the tree next evaluates, and an attack state in the middle of a swing would have to cooperate. A component reacting to the health change can do it at once.

Attacks unlock per phase through tags as well. Every attack entry has `RequiredTags` and, new here, `BlockedTags`. The phase 2 throw requires `State.Phase.2`; the phase 1 throw is blocked by it. "Phase 2 adds an attack" is a data edit.

## The enrage: super armor and a paused brain

Entering a phase runs a server-only ability that plays the enter montage. While it runs, the enemy has `State.PhaseTransition`, and that tag does three jobs:

- The ability cancels the running attack and any reaction, and is not blocked by `State.Reacting`, so it always starts.
- The reaction component refuses new reactions and groggy build-up while the tag is present. That is the super armor.
- The AI controller adds the tag to its list of tags that disable the brain, so the State Tree pauses until the enrage ends.

Phase 2 also gets a damage x1.2 effect and a montage play rate of 1.15, which the enemy attack ability reads from the phase component when it plays a montage.

In the test, a hit during the ground smash took Rampage from 775.8 to 720.8 health, below half of 1500. The log showed it entering phase 2 and raising the shield, the brain paused, the enrage montage played, and the smash was cut (no area hit was logged). A stagger thrown in during the enrage did nothing. The brain resumed 2.3 s later, both machines had the phase and shield tags, hits now based on 14.4 instead of 12, and only phase 2 attacks were chosen from then on. The phase never triggered again.

One detail: the phase check waits while the boss is groggy and skips a dead boss, so a phase change can't stomp on a stun or a death.

## Patterns as weighted children in State Tree

The tree as built:

```
ST_Boss_Rampage
 ├─ Idle (FindTarget) -> Combat
 └─ Combat (HoldTarget; fail -> Idle), children by priority
     ├─ Phase2 (enter: has State.Phase.2), random weighted children
     │   ├─ ShieldRegen (enter: regen ready) -> phase enter again + shield on
     │   ├─ Pattern "Double Toss": Rip/Toss -> Toss_Enraged          (far)
     │   ├─ Pattern "Rampage": Melee A -> C -> GroundSmash          (near)
     │   └─ CombatLoop (linked ST_Enemy_CombatLoop: one select -> approach -> attack round)
     └─ Phase1, random weighted children
         ├─ Pattern "Smash Chain": Melee A -> B -> GroundSmash      (near)
         └─ CombatLoop (linked)
```

A pattern is a state whose children are steps; each step approaches and plays one attack chosen by tag. A `PatternReady` condition checks the pattern's cooldown and range before the state can be entered, and the pattern starts its cooldown on enter. Pattern cooldowns share the same cooldown map as single attacks, keyed by tag. When any leaf finishes, control goes back up to `Combat`, which selects again, so a phase change is picked up as soon as the current action ends.

Two engine features made this cheap, and I checked both in the 5.8.3 source before building on them:

- **Weighted random selection.** A state can select its children with `TrySelectChildrenAtRandomWeightedByUtility`, using each state's `Weight`. With a constant consideration of 1, that's simply weighted random.
- **Linked assets.** A state of type `LinkedAsset` runs another State Tree asset. The plain enemy loop (select an attack, approach, attack) became its own asset, `ST_Enemy_CombatLoop`, that runs one round and ends with the tree succeeding. The boss links it in as one of the weighted options, so between set pieces it fights like any enemy without duplicating that logic.

The [State Tree overview](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine) covers how selection and transitions work if you haven't used them.

I build both trees from C++ in an editor function library and run it from Python. `SetLinkedStateAsset` is exported from the editor module, so the builder can link trees in code. The catch is that a rebuild overwrites any hand edits made in the State Tree editor, so pattern numbers live in the builder.

In the test, the smash chain ran swing A, swing B, ground smash in order, and its starts were 16.0 s and 15.7 s apart with a 14 s cooldown.

## The shield comes back on a world-time stamp

Phase 2's shield mode is `Regenerate`, with a 20 s delay. The other modes are `None` and `Once`. When the shield drops, the phase component marks a regeneration as pending, and when the groggy stun ends it stamps the world time. A `ShieldRegenReady` condition in the tree compares against that stamp, and the `ShieldRegen` state replays the enter montage and raises the shield, which resets the breaker parts.

The raise request itself is handed to the AI controller and runs on its tick, outside the State Tree update.

Tested: both arms broken dropped the shield into a 5 s groggy, and the shield came back with the enrage montage 20.07 s after the groggy ended, with the parts full again on the client. Breaking the back from behind dropped it through the other group.

## A rock that only the server judges

The rock throw is the first enemy projectile. The montage has a release notify at 1.55 s that sends `Event.Projectile.Spawn`; the attack ability spawns the rock at a socket, aimed at the target's current position with no lead.

The projectile actor replicates, sends its speed once with `COND_InitialOnly`, and lives 4 s. Only the server checks overlaps. Hitting `WorldStatic` geometry destroys it. A hit on the player goes through the same defense chain as a melee hit, now split into `CanHitTarget` and `ResolveHit` so the projectile can ask for the result. If the result is an evade or a perfect dodge, the rock flies on.

The throw's defense type is `DodgeOnly`, so a held guard does nothing and the full hit lands. In the test the rock showed in flight on the client, a dash at 326 cm evaded and the rock flew on and expired, and dummies in its path were not hit. Rocks fired straight into nearby geometry were stopped at once but logged the blocker as `None` (a component with no owning actor), so the log needs to name the component.

## Telling the player how to defend

Every enemy attack has a defense type: `Parryable`, `Unblockable` or `DodgeOnly`. At the start of each attack, the ability fires a static GameplayCue, `GameplayCue.Telegraph.Defense`, with the defense type packed into `RawMagnitude`. Parryable attacks show nothing, unblockable ones flash red, dodge-only ones flash purple. It's a debug sphere above the head for now; the cue is the hook for real effects later.

I also designed, but didn't build, a fourth level for lethal attacks: a separate `bLethal` flag that's always dodge-only and kills without the damage calculation if not evaded. It has to be readable from a fixed set of signals: a black and red skull mark, its own warning sound, a glowing projectile with a screen-edge vignette, and a telegraph of at least 1 s that the data validation will enforce.

## Applying this to your own boss

- Put HP thresholds in data and judge them in one server-side component that sets a tag. Let the tree read the tag.
- Give the phase transition a tag that blocks reactions and pauses the AI, and let it cancel the current attack.
- Use `RequiredTags` / `BlockedTags` on attacks so phases unlock and retire moves without code.
- Keep the regular enemy loop as its own State Tree asset and link it into boss trees.
- Judge projectile hits on the server only, and reuse the melee defense chain so dodge rules stay identical.

## Asset notes, and what's still rough

The boss comes from Epic's Paragon Rampage pack. The pack has no Physics Asset, so I made one with 77 bodies. The mesh is about 220 cm tall and faces +Y, so it needs a capsule of radius 60 / half-height 110, a mesh offset of z -110 and yaw -90. Two materials with the same name came along in the copy and one slot pointed at the wrong one; I fixed the slots by hand, and now check slot materials after every pack copy.

Still to do: Rampage picks melee attacks from far away and walks in, because selection only filters by minimum range. The rock isn't held in the hand before release. The knockback, down and launch reactions borrow a front hit react clip. Two pack materials fail to compile for SM6 and fall back to the default material. Feel tuning (size, speed, recovery after combos, rock timing and size) went to a separate pass, and the wiki lists what the first playtest found.
