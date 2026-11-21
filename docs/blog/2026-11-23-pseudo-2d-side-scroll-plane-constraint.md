---
title: "A 2D Side-Scrolling Section Inside a 3D UE5 Game: CharacterMovement Plane Constraint, a Side Camera Mode and Why GetBaseAimRotation Rejected Every Shot"
description: "How I added a side-scrolling stretch to a 3D UE5 action game with a trigger volume: the CharacterMovementComponent plane constraint (so dashes, root motion and knockback can't drift), a camera mode override instead of a second camera, move input mapped to the section axis, an in-plane aim cursor used as the control rotation, and the server shot check that failed because APawn::GetBaseAimRotation returns the side camera's view."
date: 2026-11-23
workedOn: 2026-10-23
publishAt: 2026-11-23
track: "2D side-scroll section"
category: "Build Logs"
sidebar: "2D Side-Scroll Section"
image: /blog/pseudo-side-scroll-c.jpg
outline: deep
tags: [UE5, Character Movement, Camera, Level Design, Multiplayer]
---

# A 2D Side-Scrolling Section Inside a 3D UE5 Game: CharacterMovement Plane Constraint, a Side Camera Mode and Why GetBaseAimRotation Rejected Every Shot

PSEUDO is a third-person 3D action game, and one stretch of it plays as a 2D side-scroller: walk into a trigger box, the camera swings to the side, and you can only move left, right and up until you leave. This build log covers how that works in UE5 with the character, camera, input and combat code the game already had. The short version: the `CharacterMovementComponent` plane constraint does the depth lock, an override in the existing camera mode system does the camera, and the one real surprise was that the server rejected every pistol shot, because `APawn::GetBaseAimRotation` returns the camera's view, and the camera now looked in from the side.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-side-scroll-c.jpg" alt="A trigger volume locks the player to a plane; the aim lives in the plane too." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-side-scroll-c-dark.jpg" alt="A trigger volume locks the player to a plane; the aim lives in the plane too." loading="lazy">
</figure>

## A volume that turns 2D on and off

A side-scroll volume is a trigger box. A player inside plays in 2D; leaving restores everything. The plane goes through the volume's location, with the volume's right axis (Y) as its normal. Screen right is the volume's forward axis (X), and the camera looks from the +Y side. Moving or rotating the volume re-orients the whole section, so there's nothing else to set up.

A component on the player character holds the 2D state: it switches the camera, sets the movement constraint, remaps input, turns lock-on off and handles aiming. A local loose tag, `State.SideScroll`, marks the player as inside.

## Locking depth with the movement component's plane constraint

`UCharacterMovementComponent` can constrain all movement to a plane, given a normal and an origin. On entering, the component sets the constraint from the volume, snaps the character onto the plane and projects its velocity into it.

The reason to use the constraint rather than, say, zeroing the Y input is that the constraint filters every move delta: input, dashes, root motion, launches and knockback. Nothing can push the character off the line. I sampled the depth every frame while trying to break it: diagonal input plus jumps, ground dashes with diagonal input, a back dash, a `LaunchCharacter` with a sideways component, a 306 cm knockback, and three runs in and out. Every one read 0.000. Entering 80 cm off the plane snapped to 0.

Enemies inside the volume are constrained to the same plane on the server for as long as they're inside. They follow the line anyway, and it keeps the fight readable.

## The side camera as one more camera mode

PSEUDO already blends between camera modes (arm length, offset, field of view, lag) through data assets picked by gameplay tags; the [camera wiki page](/wiki/pseudo/systems/camera) describes the normal modes. For 2D I added an override mode to that component, `SetOverrideMode`, which beats every tag rule, and a side mode asset: arm 1100, offset Z 60, FOV 55, lag 8, blend 0.6 s.

The spring arm also stops following the control rotation while inside. It gets an absolute rotation taken from the volume (a configurable pitch, -8 in the test section) and a rotation lag of 6, which smooths the swing to the side. On leaving, everything goes back: constraint off, arm on control rotation, no absolute rotation, no rotation lag, arm length 400. The control rotation is left at the side view, so the normal orbit camera continues from where the side camera was, rather than snapping.

Reusing the camera mode blend meant no second camera actor and one place to put future special cameras.

## Input along the section axis

Inside, the move input's X value moves the character along the section axis and its Y value is dropped; jumping is unchanged. The change is made on the move action's value, not on keys, so remapped controls still work.

Facing follows the 3D rules: with melee weapons or stowed, the character faces where it moves; with pistols, it faces the aim and strafes. Lock-on is released on entry and the lock-on key does nothing inside, because lock-on picks targets from the camera's view, which now points into the screen.

## An aim cursor that is the control rotation

Aiming pistols in 2D needs a direction in the plane. The simplest version I found was to make the control rotation itself the aim: yaw is the facing along the section axis, and pitch is the aim angle, limited to ±80°. The look input (mouse or right stick) moves a virtual cursor, a unit vector in the plane pointing right and up, clamped to that pitch limit. Horizontal look input to the other side flips the facing. The look input's would-be rotation is read from the controller, so mouse sensitivity and invert Y still apply, and mouse and stick share one path.

In 2D, shots start at the character's eyes (`GetPawnViewLocation`) and follow that aim, so the ray stays in the plane. The crosshair is drawn on that ray, 400 cm in front of the eyes. None of this needed cursor deprojection, and the existing shot code could stay. The server checks needed one change, below.

## The server check that read the camera

The first pistol test in 2D: every shot was rejected by the server as "off the aim (84 > 30 deg)".

The server validates each shot against where the shooter is aiming, and it got that from `APawn::GetBaseAimRotation`. For a player-controlled pawn, that returns the camera's view, which in the section is the side camera looking along the plane's normal, roughly 90 degrees away from the actual aim inside the plane.

The fix was a small function, `GetPawnAimRotation(Pawn)`, on the side-scroll component: it returns the in-plane aim when the pawn is in 2D and `GetBaseAimRotation` otherwise. The shot view check, the shot hit check and the animation aim offset all call it. After that, two shots aimed left with the look input hit the enemy twice, with 0 rejections.

If your game uses `GetBaseAimRotation` for anything (server checks, aim offsets, AI), it is worth knowing it follows the camera, so a camera that doesn't look where the character aims breaks it.

## Single player only, checked every 0.2 seconds

The 2D state isn't replicated or predicted. The volume runs only on the server, and only while the game state has at most one player. The movement constraint is set on the same machine that simulates the pawn, which on a listen host playing alone is the host itself, so no prediction is involved.

The volume re-checks every 0.2 s and on overlaps. If a second player joins while the host is in 2D, the host is restored to 3D (in a later test, in the same millisecond as the join) and goes back into 2D when the client leaves. With a client connected, both players can walk through the box in 3D; the log says the session has more than one player.

The same re-check handles death. After a checkpoint retry inside the section, the new pawn spawns inside the volume and enters 2D once it is possessed, without any hook in the game mode. A destroyed pawn's component restores everything in `EndPlay`.

## The greybox section

The test section is about 86 m long and built by an editor Python script, so it can be rebuilt in another map later. It uses the jump numbers from [the level metrics page](/wiki/pseudo/systems/level-metrics): a 100 cm column for a safe single jump, a 200 cm column, a 300 cm gap at equal height for a run jump, and a ledge where a missed jump lands on the ground instead of a dead end. Then an arena with an enemy, a pressure plate that runs a lift to 400 cm, a high slab you can walk under, a shot target that lowers a drawbridge, a far block with the second enemy, and the exit. The plate, lift, target and bridge are pieces from the [puzzle kit](./2026-11-23-pseudo-puzzle-gimmick-signal-system).

Two placements came out of testing. The checkpoint pillar stood on the line and blocked the only path, so it moved off the plane; its trigger still reaches the plane, and the respawn point is snapped onto it. And the shot target first hung behind the bridge gap, where the raised drawbridge, 600 cm tall at the hinge, blocked every shot. It now hangs above the high slab's far edge, about 25° up.

## Results and leftovers

Entering and leaving three times restored everything each time, including leaving at the far end into 3D. Melee combos hit inside (three hits), pistols hit after the aim fix, the plate ran the lift and the shot target lowered the bridge, lock-on turned off on entry and stayed off, a death and checkpoint retry inside re-entered 2D at once, and with a client connected nobody went 2D.

Still open: the side camera keeps its collision probe, so geometry on the camera side of the plane pulls it in (keep that side empty, or set props to ignore the camera channel); a dash with no input goes along the actor's backward direction (which is still on the plane); and the section should move into its stage map once that exists.

## For your own 2D section

- Lock depth with the `CharacterMovementComponent` plane constraint (a normal and an origin), and snap the character onto the plane on entry. It catches root motion and knockback, which input remapping would miss.
- Change the move action's value, not the key bindings, so remapping keeps working.
- If you have a camera mode system, add an override mode instead of a second camera.
- Make the in-plane aim the control rotation, and give the server a way to ask for the real aim. Don't trust `GetBaseAimRotation` once the camera stops looking where the player aims.
- If the 2D state isn't networked, decide it on the server and re-check the player count, so a join can't leave someone half in 2D.
