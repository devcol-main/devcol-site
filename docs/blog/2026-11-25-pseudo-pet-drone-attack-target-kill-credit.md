---
title: "Pet Drone, Part 2: A Companion That Only Shoots What the Player Hit, With OnGameplayEffectAppliedDelegateToTarget and Kill Credit Through the Instigator in UE5 GAS"
description: "How a UE5 pet drone picks its target from the damage the player deals (OnGameplayEffectAppliedDelegateToTarget on the owner's ability system component), shoots through a server-only gameplay ability triggered by a gameplay event, keeps its damage independent of player stats by being the instigator, passes kills to its owner, and why shots at a big mesh on a small capsule all missed. Plus crossfading single-node look clips with dynamic montages."
date: 2026-11-25
workedOn: 2026-10-30
publishAt: 2026-11-25
track: "Pet drone attack"
category: "Pet Drone"
sidebar: "Part 2: Attack"
image: /blog/pseudo-drone-attack-c.jpg
outline: deep
tags: [UE5, GAS, AI, State Tree, Multiplayer, Animation]
---

# Pet Drone, Part 2: A Companion That Only Shoots What the Player Hit, With OnGameplayEffectAppliedDelegateToTarget and Kill Credit Through the Instigator in UE5 GAS

The drone from [Part 1](./2026-11-24-pseudo-pet-drone-follow-statetree) follows the player and is ignored by every attack. In this part it learns to shoot. The rule I wanted was strict: it never starts a fight, and it only shoots the enemy the player damaged last. If you are giving a companion an attack in a UE5 game that uses the Gameplay Ability System, the parts that carry over are how the target is picked (listen to the damage effects the owner applies, on the server), how the shot is fired (an event-triggered, server-only ability), and one design choice that removed a whole class of balance problems: the drone is the instigator of its own damage, so the player's stats never reach it, and a separate step hands the kill to the owner.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-drone-attack-c.jpg" alt="The drone shoots what the owner's damage effects hit, and its kills go to the owner." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-drone-attack-c-dark.jpg" alt="The drone shoots what the owner's damage effects hit, and its kills go to the owner." loading="lazy">
</figure>

## Rules I fixed before writing code

The attack is a skill tree unlock. The base drone only follows (and later scans); shooting is a node in the drone's tree, with two more nodes on top of it: power ranks and range ranks.

- It shoots only the enemy the player last damaged, never first. If the player puts the weapon away, the drone drops its target.
- The enemy must be within 2000 cm of the player (the range node raises that to 3000, 4000, then no limit). I started at 1500 cm and raised it after playing.
- The drone needs line of sight from its own position, and it only shoots from its follow point. It does not chase, and it does not fire while it is flying back to the player.
- Damage ignores the player's stats. At rank 0 the drone deals about 25 % of the dual pistols' damage per second, at the top power rank about 50 %.
- Kills by the drone count as the player's kills: experience, the kill event, and the dice ability that reacts to kills.
- Multiplayer stays as it is for now: every player has a drone.

## Picking the target from the owner's own damage

The drone's AI controller runs on the server and binds to `OnGameplayEffectAppliedDelegateToTarget` on the owner's ability system component. That delegate fires every time the owner applies an effect to someone else. The controller looks at each one and takes the target only when all of these hold:

- the effect is the game's damage effect class,
- the target is an enemy,
- the drone did not cause it (otherwise the drone would keep re-targeting itself),
- the attack node is unlocked and the player has a weapon drawn.

I chose this over polling "who is the player fighting" because it uses an event that already exists for every hit, from any weapon, and it needs no change inside the weapon abilities. A new weapon added later feeds the drone with no extra code.

A second function drops the target when it dies, when the player stows the weapon, or when the attack is no longer unlocked (a skill respec in the middle of a fight dropped it on the next frame in testing).

### The gate, as one condition

Whether the drone may shoot right now is one function, `CanAttack()`, also wrapped as a State Tree condition. It checks: unlocked, armed, target alive and targetable, within the engage range of the **owner** (0 means no limit), and a clear line trace from the drone to the target against world static and world dynamic geometry.

The State Tree from Part 1 gained a third state. Follow moves to Combat when the condition passes; when Combat completes it returns to Follow. Return (the catch-up flight) never goes to Combat, so a drone that fell behind does not shoot on its way back.

## Firing through a server-only ability

Inside Combat the controller keeps the follow movement and the stuck rules from Part 1, turns the drone to face the target, and counts down a fire interval. When it reaches zero it sends a gameplay event to the drone's own ability system component, with the target and the damage in the event data. A server-only gameplay ability triggered by that event does the shot:

1. Pick the next barrel bone (left and right in turn).
2. Check for world blockers between the barrel and the target, then trace for the body.
3. Apply the hit through the same hit function the player's guns use, marked as ranged, with no hit reaction and no hitstop.
4. Execute a gameplay cue for the muzzle flash and the fire clip, so clients see it.

Two timing details mattered:

- The first shot comes one interval after Combat starts, so the weapons have time to come out.
- The countdown uses `DeltaTime x the owner's CustomTimeDilation`. The game slows the world after a perfect dodge and scales the player back up with `CustomTimeDilation` (see [the slow-motion post](./2026-11-16-pseudo-time-dilation-lock-on-hitstop)). Counting on the owner's clock keeps the drone in step with the player instead of with the slowed enemies.

## Damage that ignores the player's stats

The shot's effect context is the drone's default context, so the instigator is the drone. The damage calculation captures attributes from the instigator, and the drone has an empty stat set: no crit chance, no dexterity, no ranged bonus. The number that arrives is the one in the drone's data asset, scaled only by its power rank.

That is the whole reason the balance rule holds. In the test I gave the player 500 dexterity, 500 strength, 100 % crit and a 3.5 ranged bonus, and the drone's damage log did not change (`base 14.0 x scaling 1.000 ... crit no`).

To hit the 25 % target I compared with the pistols at starting stats: 8 damage x 1.1 x 1.1 every 0.15 s is 64.5 damage per second (67.0 with average crits). The first drone value, 7 damage every 0.5 s, was 14 per second, about 21 to 22 %. I raised it to 8.2 per shot: 16.4 per second, 24.5 to 25.4 %, and 32.8 per second at the top rank, about 50 %.

## Handing the kill to the owner

With the drone as the instigator, a drone kill would belong to the drone. One helper, `ResolveKillCredit`, fixes that in a single place: if the instigator is a pet, it returns the pet's owner pawn. The experience award, quests and the kill-reactive dice ability all read the kill event that already existed, so none of them changed. The test log showed `Dummy killed, credit: <player> (hit by <drone>)` followed by `+20 XP`.

The other direction needed a filter too. Enemy perception ignores instigators that are not players, so a drone shot does not make an enemy turn on the drone.

## Why every shot at the big dummy missed

The first test against a large training dummy missed every time. The drone aimed at the capsule centre, and this dummy had a big mesh on a small capsule: the centre was the empty space between its legs, and the trace went straight through.

The aim point is now the centre of the mesh bounds. If a trace still slips through, it counts as a hit without a bone, because line of sight was already checked. If your projectiles or traces aim at `GetActorLocation()` or the capsule centre, try them against your widest, oddest-shaped enemy first.

## Making the look clips blend

The drone's mesh came with clips for a hover loop, a dodge and firing. The hover is the first ten frames of the attack clip, swung back and forth at a varying speed. Now and then the drone turns left or right with its weapons stowed: those clips are the dodge clips with every bone except the root set to the hover pose, because the original dodges spin with the weapons out. Weapons deploy only in combat. Out of combat the drone also drifts a little from side to side, ±3 units, fading to zero within half a second when combat starts.

The first version played these clips as single-node animations, and a single node cannot blend: combat starting during a turn gave a visible pop. In the follow-up look pass I moved every clip onto a one-slot animation blueprint and played each as a dynamic montage (`CreateSlotAnimationAsDynamicMontage`) with auto blend-out turned off, so a clip holds its last pose. Playing a new one with `bStopAllMontages` blends the previous one out over 0.15 s. The hover is a paused montage whose position is set by hand each frame. In the test every switch started while the previous montage was still blending out in the same frame, which is the crossfade I was after.

The same pass removed the tracer from the drone's shot (the pistol's fixed-length ribbon ran far past the drone when seen from the side), so the shot is a muzzle flash and an impact, and it added a warp effect at both ends of the stuck teleport from Part 1, sent as a gameplay cue so clients see it.

## How it was tested

Listen server and one client, enemies frozen, a player hit simulated by applying a damage spec from the owner's ability system component (the same path a weapon hit takes):

- Locked: no target from a hit. Unlocked: combat 60 ms after the hit, first shot 0.5 s later, then every 0.5 s.
- Hitting enemy B while the drone shot A switched the target; the next shot went to B.
- Stowing the weapon dropped the target; a hit while unarmed gave none.
- A target 1748 cm from the player was remembered but not engaged (range 1500 at the time); moving to 1200 cm started combat. A wall between drone and target stopped the shots; removing it resumed them. Teleporting the player 1300 cm put the drone in Return, with no shots until it was back.
- Range ranks: rank 0 engaged at 1800 cm and not at 2300, rank 1 at 2800 / 3300, rank 2 at 3800 / 4300, rank 3 at 4800.
- The fire clip played on server and client, so the cue reaches the client.

## What to reuse

- Let a companion learn its target from `OnGameplayEffectAppliedDelegateToTarget` on the owner's ability system component, filtered by damage effect class and "not caused by me". It works for every weapon without touching them.
- Make the companion the instigator of its own damage when its numbers must not scale with the player, and resolve kill credit in one helper so every kill listener keeps working.
- Time a companion that should keep pace with a slowed-time player on the owner's `CustomTimeDilation`.
- Aim at mesh bounds, not the capsule centre, for anything with an unusual silhouette.
- If look clips need to blend, play them as dynamic slot montages instead of single-node animations.

Next: [Part 3, the scan](./2026-11-25-pseudo-pet-drone-scan-custom-stencil-post-process).
