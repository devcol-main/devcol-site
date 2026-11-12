---
title: "Melee Hit Detection in UE5 With GAS Target Data: Blade Sweeps, Physics Asset Bones and Server Validation"
description: "How PSEUDO detects greatsword hits in Unreal Engine 5: a weapon definition with blade sockets, a per-frame blade sweep in an ability task that returns the bone hit, client hits sent to a listen server as GAS target data, server-side plausibility checks, and a damage execution. Plus why a stowed weapon has to be its own replicated property."
date: 2026-11-14
workedOn: 2026-10-19
publishAt: 2026-11-14
track: "Weapons and hit detection"
category: "Build Logs"
sidebar: "Melee Hit Detection"
image: /blog/pseudo-hit-sweep-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Multiplayer, Physics]
---

# Melee Hit Detection in UE5 With GAS Target Data: Blade Sweeps, Physics Asset Bones and Server Validation

After the [combo graph](./2026-11-14-pseudo-melee-combo-graph-build), the greatsword could swing but couldn't hurt anything. This build log covers the two pieces that came next: a weapon that exists as data and a mesh in the hand, and a hit pipeline that detects blade contact on the attacking machine, sends it to a listen server, checks it and applies damage. The short version for your own project: sweep the blade between two sockets every frame instead of using a collider, narrow the hit down against the target's Physics Asset to get a bone, send it as GAS target data, and validate distance and angle on the server.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-hit-sweep-c.jpg" alt="The attacker sweeps the blade every frame and the server checks the hit before damage." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-hit-sweep-c-dark.jpg" alt="The attacker sweeps the blade every frame and the server checks the hit before damage." loading="lazy">
</figure>

## A weapon as a data asset

Before this, the "current weapon" was only a gameplay tag that picked an animation layer. I replaced it with a weapon definition, a primary data asset holding:

- the weapon tag (still used by the combo to find its graph),
- a soft reference to the mesh, an attach socket and offset,
- material slots on the character to hide while the weapon is drawn,
- base damage.

The player character replicates the equipped definition. On every machine, applying it restores the slots the old weapon hid, hides the new ones, loads and attaches the mesh, and links the weapon's animation layers. The server equips the pawn's default weapon on possess.

The greatsword mesh didn't exist on its own. It was part of a Paragon character mesh as a separate material section, so I extracted that section with Geometry Script, put the pivot where the character's weapon bone sits, and added two sockets along the blade, `Blade_Base` and `Blade_Tip`. Those sockets are what the hit detection reads. The pistols belong to the base character as skinned geometry, so drawing the sword hides their material slot instead of detaching anything.

### Why the stowed weapon is replicated separately

When you draw the pistols, the greatsword goes on your back instead of disappearing. The obvious way to do that is to look at the previous weapon in `OnRep_EquippedWeapon(Old)` and stow it. I didn't, because the "previous weapon" only exists at the moment of the switch, on machines that saw the switch. A client that joins later, or that only becomes relevant later, receives the current equipped weapon and nothing else, so it would never put the sword on the back.

So the character replicates a second property, `StowedWeapon`, and the server sets it: drawing a weapon with a mesh clears it, drawing a weapon without a mesh stows the previous mesh weapon. One function reads both replicated values and decides what to show, so the result doesn't depend on which `OnRep` arrives first. If something visual depends on what the value was before, replicate the result instead of relying on the transition. (This was later folded into a two-slot weapon swap, but the rule stayed.)

## Sweeping the blade, not overlapping a collider

A collision volume on the blade with overlap events is the quick option. I chose a per-frame sweep for two reasons: a fast swing can pass through a thin target between two frames (tunneling), and an overlap doesn't tell you which bone you hit.

The sweep lives in an ability task that only runs where the pawn is locally controlled ([Gameplay Ability Tasks](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-ability-tasks-in-unreal-engine) explains the task model). It starts and stops on the hit-window gameplay events sent by the combo's notifies. Each tick it:

1. Takes 4 points from `Blade_Base` to `Blade_Tip` and sweeps a 10 cm sphere from where each point was last tick to where it is now.
2. **Broad phase:** the sweep looks for pawns.
3. **Narrow phase:** for each candidate, `SweepComponent` against its skeletal mesh, which tests the Physics Asset bodies and returns the bone and the impact point. Touching only the capsule is a miss.
4. Reports each target once per window. Players are never reported, since the game is PvE.

A console variable draws the sweep, and a log category prints each hit with its bone. One test showed why the sweep matters: the finisher's slam moves the blade tip about 90 cm per frame, and it still hit.

A side lesson from the same work: the base character's `weapon_r` bone sits about 125 cm from the hand, so it isn't a grip bone. The sword attaches to `hand_r` with an offset taken from the source character's grip, which puts the grip 11.9 cm from the hand bone.

## Sending the hit to the server as target data

On a listen server, a client's hit has to reach the server. I compared a custom RPC on the ability system component with GAS's own target data path and went with target data:

- The attacking client wraps the hit result in `FGameplayAbilityTargetData_SingleTargetHit` and sends it with `CallServerSetReplicatedTargetData` inside an `FScopedPredictionWindow`.
- The server's copy of the ability binds `AbilityTargetDataSetDelegate` when it activates, then calls `CallReplicatedTargetDataDelegatesIfSet` in case the data arrived first. In the callback it copies the data, calls `ConsumeClientReplicatedTargetData`, validates and applies the effect.
- The listen host calls the server path directly.

The combo advance stayed on its own RPC; only hits use target data.

## What the server checks

The server rejects a hit unless:

- the attack is still running,
- the target is a valid non-player with an ability system and isn't dead,
- this target wasn't already hit by this combo node,
- the impact is within 350 cm of the attacker and within 120° of their facing,
- the impact point is within 150 cm of the target.

I left out one check I had planned: the server doesn't verify that the hit falls inside the hit window. The server's copy of the attack runs a few frames behind the client, so a strict window rejected legitimate early hits. "One hit per target per node" replaced it. A cheat command that reports a hit on the farthest dummy was rejected with `too far (1601 > 350 cm)`.

For PvE co-op on a listen server I decided this is enough. Still open, for any PvP mode: plausible fake hits inside 350 cm and 120° pass, there's no window timing check, and the client decides the perfect flag. The plan is to compare the impact with the server copy's recent blade path, check timing against the server's montage position with a tolerance, and limit hits per node.

## Damage as an execution

Damage is a native instant gameplay effect with a custom execution calculation and a hit gameplay cue. The ability passes base damage, the attack's multiplier and the perfect bonus as SetByCaller values. The first formula was:

```text
Base x Multiplier x (1 + PerfectStack) x Crit x 100 / (100 + Defense)
```

with a 1.5x crit. The result goes into an `IncomingDamage` meta attribute that the health set turns into health loss, adding a replicated `State.Dead` tag at zero. The hit result rides in the effect context, so the cue plays at the impact point on both machines. In tests the numbers matched by hand: 10 normal, 11 perfect, 15 crit, 16.5 both. The full current formula, with stats and resistances, is on the [Damage Formula](/wiki/pseudo/systems/damage-formula) page, and the stat side has [its own build log](./2026-11-14-pseudo-data-driven-stats-mmc).

Tested with a listen server and one client: hits from both the client and the host with bone names, one hit per swing per target, two targets in one swing, health replicated, the cue on both machines, and dead dummies refusing further hits. The first test failed for a dull reason: the dummies stood outside every swing path. That bug and the grip bone are in [A Greatsword at the Hip and Swings That Hit Nothing](./2026-10-19-pseudo-greatsword-grip-and-hits).

## Left for later

The hit cue runs on the enemy's ability system, so the attacker's own hit feedback waits for the server. Predicted local feedback needs a cue on the attacker's side inside the prediction window. And the finisher's hit window covered mostly its windup; it needed retuning with the feel pass.
