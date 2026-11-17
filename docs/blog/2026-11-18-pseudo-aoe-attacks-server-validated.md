---
title: "Area Attacks in UE5 GAS the Server Can Trust: One Sphere Query, Multi-Target Target Data and a Telegraph Ring Timed by the Montage"
description: "How I added area-of-effect attacks to a UE5 listen-server action game with the Gameplay Ability System: a shared sphere overlap with line of sight and Physics Asset bones, all hits sent in one TargetData handle, a server that rebuilds its own sphere instead of trusting the client's, and a two-circle GameplayCue telegraph that reads each machine's own montage position."
date: 2026-11-18
workedOn: 2026-10-21
publishAt: 2026-11-18
track: "Area attacks"
category: "Build Logs"
sidebar: "Area Attacks"
image: /blog/pseudo-aoe-ring-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Multiplayer, C++]
---

# Area Attacks in UE5 GAS the Server Can Trust: One Sphere Query, Multi-Target Target Data and a Telegraph Ring Timed by the Montage

This build log is about area attacks: a greatsword finisher that hits everything in front of the player, and an enemy ground slam with a warning circle on the floor. If you are adding the same thing to a networked GAS project, the answer in one line is: let the attacking client find the targets and send them all in one target data handle, have the server rebuild the sphere from its own copy of the attacker and check every entry against that, and drive the telegraph from the montage each machine is actually playing, not from a replicated timer.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-aoe-ring-c.jpg" alt="The server rebuilds the AoE sphere itself; the warning ring follows each machine's montage." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-aoe-ring-c-dark.jpg" alt="The server rebuilds the AoE sphere itself; the warning ring follows each machine's montage." loading="lazy">
</figure>

The rules from the player's side (which attacks are area attacks, how the warning looks) are on the wiki's [Combo and Cancels](/wiki/pseudo/systems/combo-and-cancels) and [Defense](/wiki/pseudo/systems/defense) pages. This post is about how it is built. It sits on top of the blade-sweep hit detection described in [Melee Hit Detection in UE5 With GAS Target Data](./2026-11-14-pseudo-melee-hit-detection-build).

## Data decides, lock-on only aims

I kept the scope small on purpose. One player attack (the greatsword's fifth combo hit) and one enemy attack (a minion slam) became area attacks. The shape is a sphere pushed forward from the attacker, with no damage falloff. A cone angle and a falloff curve went on the later list.

The deciding question was what makes an attack an area attack. One option was to tie it to lock-on: area damage while not locked, single target while locked. I chose not to. An attack is an area attack because its data says so, and lock-on keeps doing what it does for every other attack: turn the player to face the target. That keeps one rule per system and makes the behavior predictable.

So the data change is two fields, added both to the player's per-node attack spec and to the enemy attack entry:

- `AoERadius`: 0 means "use the normal weapon sweep", anything above 0 makes the node an area attack.
- `AoEForwardOffset`: how far in front of the attacker the sphere's center sits.

The greatsword finisher uses 300 cm, centered 100 cm ahead. The minion slam uses 250 cm, also 100 cm ahead.

## No new notify: the hit window start fires the query

My plan had a new gameplay event and a new anim notify for "the area hits now". While building it I dropped both. Every attack montage already has a hit window notify state (`Event.Hit.Window.Begin` at its start) that normally starts the blade sweep. For an area node, that same begin event runs one sphere query at `Avatar + Forward * Offset` instead of sweeping. The designer moves one notify to change when the slam lands, and the warning ring (below) follows it.

The finisher's montage turned out to have two hit windows on that node, so the query ran twice. The second run was rejected as "already hit" and dealt no damage, but it was noise. A per-node `bAoEDone` flag now makes the query run once per node.

## The shared query

Player and enemy attacks call the same static function. In order, it:

1. Overlaps pawns in the sphere.
2. Skips the attacker and anyone on the same side. There is no friendly fire in either direction.
3. Traces line of sight from the sphere's center to each candidate. A wall between them blocks the hit.
4. Runs a narrow phase per target: finds the closest Physics Asset body, which gives a bone and an impact point, so the rest of the hit pipeline (part damage, hit direction, reactions) gets the same kind of `FHitResult` a sword sweep would give it.

It returns one hit result per target. A plain capsule overlap would only tell you that a pawn is in range, not where it was hit.

## Why the server never sees the client's sphere center

On the player side, the attacking client runs the query and sends every hit in **one** target data handle. The server then validates each entry against a sphere it builds itself, from the server's copy of the attacker's position and facing. The client's center is never sent, so there is nothing to trust or fake.

Per entry, the server checks:

- the target is alive and is not a player;
- this node has not hit it already (each target is hit at most once per node);
- the edge of the target's capsule is within `Radius + AoEValidationTolerance` of the server's center (the tolerance is 100 cm, to absorb lag);
- no `WorldStatic` geometry sits between the center and the target.

Accepted entries go through the same function a single sword hit uses, which runs the defender's chain: dodge, parry, guard, damage, groggy, reaction. One swing can be parried by one target and land on the one next to it.

Enemies skip the client step. The server runs the same query and sends each target through the normal enemy hit path, with the same side rules and defense chain.

The test worth copying is a cheat. A debug command made the client send a fake hit on a target far outside the sphere during the finisher. The server logged `rejected ... outside the AoE (3060 > 400 cm)` and applied no damage. The 400 is the 300 cm radius plus the 100 cm tolerance.

## The telegraph: a GameplayCue sized by RawMagnitude

The enemy's warning is a replicated GameplayCue, `GameplayCue.Telegraph.AoE`. It is added when the attack starts and removed at the hit window start, or when the attack is cut. Both ends are tied to the montage, not to timers.

The cue passes the sphere through the standard [`FGameplayCueParameters`](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/GameplayAbilities/FGameplayCueParameters?lang=en-US): `Location` is the center and `RawMagnitude` is the radius. The cue notify is a small C++ actor class (an `AGameplayCueNotify_Actor` child) that sizes a deferred decal from the magnitude, with a Blueprint child for the material. I built the radius logic in C++ rather than in the Blueprint graph because scripting a Blueprint graph from editor Python is unreliable.

The first ring rendered standing on its edge. The cue's spawn transform overwrote the decal's rotation that I had set in the constructor. Setting the rotation in `OnActive`, together with the location, fixed it: decal pitch -90, size 200 x 250 x 250 for the slam.

## A filling disc that follows each machine's own animation

A single ring shows where the hit lands but not when. I added a second decal: the outer ring stays at the full radius (rim only), and an inner disc grows from 0 until it touches the ring at the moment of impact.

The first version timed the disc with a replicated "seconds until the hit" value and world time. On the client the disc was already full when it appeared, because by the time the cue arrived the clock had moved on.

The version that worked has no replicated timing at all. Every machine reads the attacker's montage as **that machine** is playing it: the current montage position and the time of the first hit window in it (a helper on the hit window notify state finds that begin time). The disc's size is just "how far between attack start and hit window are we". Latency, hitstop and an attack that is cut all take care of themselves, because the disc follows the animation instead of predicting it. `WhileActive` also shows the decals, for a client that missed `OnActive`.

At normal speed the host and client discs stayed within about 13 units of each other at each sample and both disappeared on the line that logged the area hit. Under heavy world slow motion (`slomo` 0.1 to 0.3) the client's disc ran ahead (208 against 133), because the client's montage proxy runs ahead under world time dilation. In this game a world-wide slowdown only happens in single player, so I left that for polish.

## If you are building this

- Make "area or not" a data field on the attack, so it's one switch per attack and not a mode.
- Do the narrow phase per target (closest physics body) so area hits carry a bone and an impact point like any other hit.
- Send all targets in one target data handle, and validate each entry on the server against a sphere built from the server's own attacker transform, with a tolerance for lag.
- Mark "this node already queried" so a second hit window can't run the query twice.
- Time telegraphs from the local montage position, not from a replicated duration. GameplayCue parameters are enough to carry the center and radius.

## What the tests showed, and what's still rough

On a listen server with one client, the host and the client finisher each logged one area hit with three dummies, and each dummy took damage and a knockback once. A dummy outside the radius and one behind a wall were not hit, and the other player standing inside the sphere was not reported. The slam hit the player inside the ring and not one 450 cm away; a dash through it evaded and a guard took reduced damage, the same as a single hit. The dummy inside the slam ring was never hit, and the normal combo hits were unchanged.

Two things are still open. The slam's windup is only about 0.32 s from attack start to impact, too short to react to the ring, so it needs a bigger radius and a longer windup at the tuning pass. And the finisher's hit window fires at frame 218 of a 30 fps montage when the slam should land nearer frame 229. The fix is just moving that notify by hand in the montage, and the disc will follow it.
