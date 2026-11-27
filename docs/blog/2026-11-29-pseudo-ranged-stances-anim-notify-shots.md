---
title: "Weapon Stances and Shots Fired by Anim Notifies in UE5 GAS: an Upper-Body Hold Pose, Paid Rounds the Server Counts, and a Bullet Index NetSerialize Dropped"
description: "How I gave each ammo type in a UE5 GAS multiplayer shooter its own stance (enter montage, held upper-body pose, fire clip, exit) without replicating any of it, fired every bullet from an anim notify so shots land on the gun kicks, let the server accept a paid round of N bullets and reject shots during the stance enter, and why a bullet number sent in FHitResult::MyItem arrived on the server as -1."
date: 2026-11-29
workedOn: 2026-11-03
publishAt: 2026-11-29
track: "Combat"
category: "Build Logs"
sidebar: "Ranged Stances"
image: /blog/pseudo-ranged-stances-c.jpg
outline: deep
tags: [UE5, GAS, Animation, Anim Notify, Multiplayer, Ranged Combat]
---

# Weapon Stances and Shots Fired by Anim Notifies in UE5 GAS: an Upper-Body Hold Pose, Paid Rounds the Server Counts, and a Bullet Index NetSerialize Dropped

PSEUDO's dual pistols fire several ammo types, and they all used to look the same in the hands. This build gave each type a stance: some fire straight away, some raise the guns into a charge pose and hold it, and two bring out a heavy gun with its own enter and exit clips. The held pose is an animation blueprint upper-body pose, so fire clips play over it and the hold comes back by itself. Stances are cosmetic, and every machine plays them from the selected ammo, which already replicates. Each bullet is fired by an anim notify in the fire montage, so the shot lands on the gun kick, and the server counts bullets against a paid round. There was also a bug worth knowing about: a bullet number sent in `FHitResult::MyItem` never reached the server, because the hit result's net serialization doesn't carry that field.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-ranged-stances-c.jpg" alt="Each ammo type got a stance; bullets come from anim notifies and the server counts paid rounds." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-ranged-stances-c-dark.jpg" alt="Each ammo type got a stance; bullets come from anim notifies and the server counts paid rounds." loading="lazy">
</figure>

The shot validation underneath (cadence, range, aim, the ammo id in every shot) is in [Server-Validated Hitscan in UE5 GAS](./2026-11-19-pseudo-hitscan-pistols-server-validated), and the ranged controls are on the [Weapons wiki page](/wiki/pseudo/systems/weapons).

## Five ammo types, four kinds of stance

| Ammo | Enter | Hold (upper body) | Fire | Exit | Extra mesh |
|---|---|---|---|---|---|
| Basic | none | none | fast fire clip, 1 round = 2 bullets (left and right) | none | none |
| Shotgun | none | none | heavy fire clip at 1.5× | none | none |
| Fire / Ice / Poison | charge clip | last frame of the charge | a baked clip that plays the charge-fire motion forward and back | none, the next stance takes over | none |
| Heavy machine gun (new) | ultimate start clip | a frame of the start clip | ultimate fire clip | ultimate end clip | the big ultimate gun |
| Laser | ultimate start clip | same, also while charging | ultimate end clip, then back to the hold | ultimate end clip | the big ultimate gun |

The heavy machine gun is a new special ammo with a stock of 60, 0.1 s between rounds and 0.4× damage. The laser charges while the trigger is held, with a radial progress ring around the crosshair, and fires on release; releasing early fires nothing and costs nothing. Basic ammo became two bullets per round at half damage each, with a smaller magazine and a different regen rate.

The animations come from Paragon's Twinblast character. Before this, a separate pass had matched Twinblast's particle effects to frames and sockets and found that the muzzle sockets the game used were the wrong ones: the right barrel tip is `Muzzle_01` and the left is `Muzzle_02`, while the sockets picked earlier by name sat above the head and at the knee in the fire poses. Each ammo type now names its own muzzle sockets, looked up on the stance mesh first if one is showing.

## Why the hold is an anim blueprint pose and not a looping montage

The first decision was how to hold a pose between shots. A looping montage would need to be stopped for each fire clip and restarted afterwards, on every machine. Instead the anim instance has three values, the hold pose, a time in it and an alpha, and the animation graph blends that pose onto the upper body:

`IK → Layered blend per bone from spine_01 (blend pose = Sequence Evaluator of the hold pose at the hold time, weight = alpha) → UpperBody slot`

The montage slot sits after the blend. A fire montage plays over the hold, and when it ends the hold is still underneath, so "go back to the hold" happens for free. The alpha eases in and out over 0.2 s.

The ultimate clips in the Paragon set use the full-body default slot, which would stop the legs. The project copies run on the upper-body slot instead, and the originals are left untouched.

## Cosmetic stances driven by the selected ammo

The enter and exit montages and the extra gun mesh are cosmetic. Every machine already knows the selected ammo, because it replicates. The owner plays the stance change at once when it selects; everyone else plays it from the property's `OnRep`. No RPC or montage replication was added; the pistol glow colour already worked this way.

A small state machine per machine handles the change. If the old stance has an exit clip, it plays first, then the new enter clip, and the stance mesh appears. Exits are detected with `OnMontageStarted` and `OnMontageBlendingOut`, which also covers an exit played by a weapon swap. The big gun is a separate skeletal mesh component that follows the character with a leader pose, and the body pistols stay visible with it, as in the original.

There are a few rules around the edges:

- No firing until the enter clip is done. This is the one place gameplay waits on a cosmetic clip; more on the server side below.
- A swap or stow from a heavy-gun stance plays the exit first, then the swap, about half a second later than before.
- A weapon draw with a stance ammo selected switches the stance at once, because the draw montage owns the body. An exit cut short by a dodge or a hit during a swap brings the stance back at once.
- Laser and heavy machine gun share a stance. A feedback round asked to switch between them without replaying the enter clip. Two ammo types that have the same enter montage, hold pose, hold time and mesh now only swap the ammo, with no exit and no enter, and a running enter keeps playing.

The special fire clip plays the same motion forward and then in reverse. Negative montage play rates are unreliable, so the reverse is baked into one sequence (0 to 11.34 frames and back, 0.747 s).

## Bullets from anim notifies, rounds from the server

Firing used to happen when the montage ended. Now each fire montage has `Shot` notifies, and each notify is one bullet: the fast clip has two, at 0.01 s for the right gun and 0.15 s for the left, because the right gun kicks first. The notify goes to the ranged component, which tells the fire ability to fire a bullet: a trace, then target data to the server. Bullets line up with the visible kicks, and there are no timers, which matters because world time can be slowed in this game and the player must not be.

The cadence comes from the montage play rate: either a fixed rate on the ammo, or the clip length divided by the ammo's fire interval.

The server's side works in rounds:

```mermaid
sequenceDiagram
  participant C as Shooting client
  participant S as Server
  C->>C: StartRound: fire montage (rate = FireMontageRate or length / FireInterval)
  C->>C: Shot notify -> ranged component -> fire ability FireBullet
  C->>S: target data (shot, ammo id, bullet number in the round)
  S->>S: bullet 0: stance enter elapsed, cadence, pay; bullet n: needs the open paid round
  S-->>C: reject = predicted cost rolled back / special stock corrected
```

The cost is paid on the first bullet of a round. The server then accepts up to `BulletsPerRound` bullets for that paid round, and checks "too fast" per round rather than per bullet. One mechanism covers basic, shotgun, heavy machine gun and the special ammo.

The "no fire during the enter clip" rule is checked on the server too. When the server accepts a stance selection it starts a clock, and a shot earlier than 0.6 × the enter clip's length is rejected. The client waits for the whole clip anyway; the server check is there so a modified client can't skip the wait. A cheat command that ignores the wait on the client produced five rejected heavy machine gun shots, logged as fired during the stance enter (0.08 to 0.49 s, under the 0.66 s limit), and the client's stock was corrected.

## The bullet number that arrived as -1

On the first test, the server rejected every bullet from the remote client. The bullet's number within its round was being sent in `FHitResult::MyItem`, and the server read it as -1.

`FHitResult::NetSerialize` writes only some of the hit result's fields, and `MyItem` is not one of them. A value put there on the client is simply not on the server's copy. Moving the number to `ElementIndex` fixed it. The test run before the fix had also shown no laser, element or heavy machine gun shots at all; that didn't happen again afterwards, and most likely had the same cause.

When you pack extra data into a struct that has its own `NetSerialize`, check that function for the fields you use. Fields that work in a local test can disappear over the network.

## What the tests showed

On a listen server with one client, with injected input:

- Basic: two bullets per round, one ammo per round, no rejections on the client or the host.
- Shotgun: the heavy clip at 1.5×, rounds 1.0 s apart, no rejections.
- Fire, ice and poison: charge enter, then the hold, on server and client; the simulated proxy entered through `OnRep`. Fire rounds were 0.76 s apart.
- Heavy machine gun and laser: enter clip plus the big gun, then the hold. The heavy machine gun fired 10 rounds per second with no rejections. A laser charged for 0.80 s was accepted, and an early release fired nothing. Switching from laser to fire played the exit, hid the gun, then played the charge. A swap from either played the exit, then the holster and draw.
- Cheat checks: shots during the enter were rejected, and copied bullets were rejected as too fast or as a bullet without its paid round.

Two feedback rounds followed. The laser got a charge effect that plays on the shooter's machine right away and on the others through a replicated "charging ammo" value. Basic ammo got a regen bar under the crosshair, read from the existing regen effect's start time and period on the server clock with nothing new replicated. The heavy machine gun and laser now halve movement speed through a server gameplay effect and block sprinting; both machines know the selected ammo, so the sprint check agrees on both.

Still open: one bug report (empty basic ammo, swap to the greatsword, wait, swap back, no shot) did not reproduce in two runs, and probably comes from the greatsword auto-stowing during the wait. The look of the charge ring, the big gun's hold pose while running, and the laser end clip used as a fire clip were left for a visual pass.

## Using the same pattern for your weapons

- **Hold poses in the anim graph, fire clips in a montage slot after it.** The hold returns when the clip ends, with no extra state to replicate.
- **Drive cosmetic stance changes from replicated state you already have**, playing them immediately on the owner and in `OnRep` elsewhere.
- **Fire bullets from anim notifies** if you want shots on the visible kicks. Let the montage play rate set the cadence.
- **Have the server count bullets against a paid round**, so one cost and one "too fast" check cover multi-bullet rounds.
- **If gameplay waits on a cosmetic clip, check it on the server with a fraction of the clip length.**
- **Bake reversed motion** into a sequence instead of using negative play rates.
- **Check `NetSerialize`** before carrying custom data in `FHitResult` or any other struct that serializes itself.
