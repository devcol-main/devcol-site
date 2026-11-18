---
title: "Server-Validated Hitscan in UE5 GAS: Predicted Ammo Cost, an Ammo ID in Every Shot, and a Shotgun Spread the Server Can Re-Check"
description: "How I built dual pistols for a UE5 listen-server game with the Gameplay Ability System: one prediction window per shot, a predicted ammo cost, server checks for cadence, range, aim and walls, an ammo id carried inside each shot instead of a separate selection RPC, a stock correction RPC, and shotgun pellets the server rebuilds from a seed it derives itself."
date: 2026-11-19
workedOn: 2026-10-22
publishAt: 2026-11-19
track: "Ranged Shooting"
category: "Build Logs"
sidebar: "Server-Validated Hitscan"
image: /blog/pseudo-hitscan-c.jpg
outline: deep
tags: [UE5, GAS, Multiplayer, Weapons, C++]
---

# Server-Validated Hitscan in UE5 GAS: Predicted Ammo Cost, an Ammo ID in Every Shot, and a Shotgun Spread the Server Can Re-Check

PSEUDO's dual pistols fire hitscan shots from a Gameplay Ability on a listen server, with a predicted ammo cost and several ammo types (basic, shotgun, a charged laser, elemental rounds). If you are building client-predicted hitscan, the main lesson from this build is: let the client trace and send its hits, but make every shot carry everything the server needs to check it on its own, including which ammo it used and how its spread was seeded. Don't let the server assume that state from an earlier RPC.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-hitscan-c.jpg" alt="Each shot carries its own ammo id and the server re-derives the pellet seed, so it checks shots without trusting earlier RPCs." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-hitscan-c-dark.jpg" alt="Each shot carries its own ammo id and the server re-derives the pellet seed, so it checks shots without trusting earlier RPCs." loading="lazy">
</figure>

The pistols as a player uses them (always aiming, one fire button, the ammo wheel, regen and the perfect-dodge refill) are on the wiki's [Weapons](/wiki/pseudo/systems/weapons) page. Below is how it was built and what changed between the first version and the redesign. It reuses the target-data approach from the [melee hit detection build](./2026-11-14-pseudo-melee-hit-detection-build).

## Ammo as an attribute, cost as a gameplay effect

Basic ammo is an attribute, `Ammo` / `MaxAmmo` (24 at the time), in a small weapon-resource attribute set with a clamped base value. The fire ability's cost effect subtracts 1. Because it is the ability's real cost effect, GAS predicts it on the client and runs `CheckCost` before activation, so an empty magazine blocks the shot on both machines without extra code.

Regen is an infinite periodic effect. In the first version it added one round every 1/12 s and paused for 1 s after a shot through a short "regen delay" tag. The redesign made it simpler: +1 every 0.5 s, also while firing, with the delay effect removed. One engine detail came up here. A native C++ gameplay effect's `Period` can't be set per application, so the period and amount are read from project settings in the effect's constructor. That means changing them needs an editor restart.

Special ammo is different: each type keeps a stock count in a replicated component on the character (owner only), not an attribute.

## One prediction window per shot

Holding the trigger is automatic fire, alternating hands. Each shot on the client opens its own prediction window and, inside it, does four things: pays the cost, plays the shot cue, plays a predicted hit cue, and sends target data. The target data holds a marker (shot index, aim view) plus the hits. The trace starts from the camera center, because the character always aims while the pistols are drawn.

The server does the slow part per shot:

- **Cadence**: the time since the last shot, in real time, must be at least half the ammo's fire interval (for a charged shot, 60 % of the charge time).
- **Target**: the enemy is alive and the impact point lies on it (within its bounds plus 150 cm).
- **Range**: within the ammo's range plus 150 cm.
- **Aim**: beyond 300 cm, the hit has to lie inside the aim direction's cone plus 30 degrees.
- **Walls**: there must be no world geometry between the shooter's eye and the impact.

Accepted hits go through the same damage path as melee, flagged as ranged so a ranged damage bonus applies instead of the melee one. Rejected shots get a log line with the reason. Two cheats exercised these checks in testing: a fake shot behind a wall was rejected with `behind a wall`, and a burst with no gap was rejected with `too fast (0.000 < 0.075 s)`.

### The cadence came from the montage, and the montage blended out early

Each shot plays a short fire montage on an upper-body slot, scaled to the ammo's fire interval. The first version started the next shot when the montage began blending out. A 0.25 s blend-out on a 0.15 s montage meant the client fired every 0.085 s, and the server rejected four shots out of five as too fast. Starting the next shot on the montage's `OnCompleted` fixed it. If your fire rate comes from animation, check which montage event drives it. Blend times can quietly change it.

### Hits that the trace channel ignored

Shots from the left muzzle kept missing thin enemies. The aim point was on the capsule's surface, and the line from the left muzzle to that point passed beside the body. The first fix moved the aim point into the enemy's mesh. It didn't help at first, because the aim trace ran on the Visibility channel and the enemies ignore Visibility, so the code path never ran. After the trace was changed, both hosts hit 10 out of 10 thin dummies at 600 cm. The impact check had a related problem. One enemy's mesh is larger than its capsule, so upper-body hits were rejected as `impact 274 cm from the target` until the check used the mesh bounds.

### Shotgun pellets hit the RPC limit

The first shotgun applied one effect and one cue per pellet. That produced 25 warnings of `NetMulticast_InvokeGameplayCueExecuted ... no more RPCs this net update`. Pellets are now merged per target (one hit times the pellet count), and `net.MaxRPCPerNetUpdate` was raised to 10 in `DefaultEngine.ini`. After that the log showed `8 hit(s) applied of 8 reported` and one damage line per target.

## Why the ammo id rides inside the shot

The first design had two buttons, basic fire and special fire, and a selected special type sent to the server by RPC. The redesign moved everything onto one trigger: E (or L1) and the wheel pick a type, and the left mouse fires whatever is selected. That made one race much more likely.

The selection RPC went through the character's channel. The fire ability's RPCs go through the ability system component. The two are not ordered against each other. A quick switch followed by a press could reach the server as "fire" before "switch", and the server would fire the old type.

So the ammo of a shot is now an id inside the shot marker: 0 for basic, n for the nth special type. The server checks that the id belongs to the drawn weapon, that it's unlocked, and that it doesn't change within one press. Stock is checked when the shot is paid for. The shooter also locks the type when the ability activates: switching mid-burst only affects the next press. The selection RPC still exists, but only so other players see the right pistol tint.

This also changed cost checking. The server copy of the ability doesn't know the ammo kind before the first shot arrives, so its `CheckCost` always passes. Each shot is then checked and paid on its own in a `PayShot` step. For basic ammo, that step calls the base attribute check explicitly.

### Putting the stock back after a rejected shot

Special stock is predicted on the client. When the server rejects a special shot, the client has already taken one round off. I used the simplest fix that always converges: the server sends a client RPC with its real count on every rejected special shot. A later predicted shot may show one round off for a moment until replication catches up. In testing, a cheat that sent every client shot twice gave three accepted shots, three rejected copies, and three corrections in the log (`stock corrected by the server: 28 -> 29`). The client and server both ended at 27.

## A spread the server can rebuild

The first shotgun let the client pick its pellet directions, and the server never checked them. A modified client could have sent eight pellets straight into the head.

Now the server derives the seed itself from the shot index and the ability's activation key. It rebuilds the pellet pattern around the aim view that came with the shot and checks each reported hit against its own pellet's ray. The trace stores which pellet it was in the hit result's `FaceIndex`. Two details made this work:

- **Tolerance of 100 cm from the pellet's camera ray.** An honest impact lies on the line from the muzzle toward the pellet's aim point, so it is at most about the muzzle-to-camera offset away from the camera ray.
- **Draw the pattern around +X, then rotate it by the aim.** `VRandCone` builds its own basis from the direction, and that basis can flip when two components are nearly equal. Then the aim direction the server receives, quantized by the network, could produce a completely different pattern. Drawing around a fixed axis and rotating afterward means quantization moves the pattern only slightly.

The aim view itself has to start within 500 cm of the shooter and point within 30 degrees of its aim. With the correct seed, six shots at 835 cm had zero rejections. With a cheat that corrupted the seed, the server logged `pellet 3 off its seeded direction (189 > 100 cm)`.

## Checking your own predicted hitscan

- Log the server's reject reasons and fire a long burst on a client. If the server rejects shots as "too fast", look at what triggers the next shot. A montage blend-out can run ahead of your fire interval.
- Make sure your aim trace uses a channel your targets actually block.
- If a shot depends on state that another RPC set (selected weapon, ammo type, fire mode), put that state into the shot's own target data, or the order of arrival can change which shot the server fires.
- For random spread, derive the seed on both sides from something both already know, and generate the pattern in a fixed frame before rotating it.
- When a predicted resource can go wrong, send the server's value back on rejection. It is cruder than rolling back by prediction key, but it always ends at the right number.

## Left open after this build

The fire animation looked shaky. The clips were a big full upper-body recoil played at 2.67x and restarted every shot. I softened the blends (0.08 in, 0.10 out) and prepared a fallback with the real primary-fire clip and a `RoundsPerPress` setting (2 rounds per tap in testing), to compare in play. Muzzle flash and tracer use the Paragon Twinblast particle effects for now. There are no gun sounds yet, only hooks on each ammo type. The pistols are still part of the character's body mesh, so the per-ammo tint is a placeholder. Ammo and stances changed again later; [Switch Ammo, Press Fire, Nothing Happens](./2026-11-04-pseudo-ammo-switch-lost-presses) picks up from there.
