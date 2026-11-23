---
title: "Pet Drone, Part 1: A Flying Companion That Follows the Player in UE5 With a Plain AAIController, a State Tree and RequestDirectMove Steering"
description: "How I built a pet drone that follows a UE5 player character: spawned and despawned by a component on the APlayerState, a flying ACharacter driven by its own AAIController and a two-state State Tree, steering through RequestDirectMove because AddMovementInput overshot a falling owner, wall sweeps that ignore start-penetrating hits, a stuck teleport, and an untargetable tag that filters hit queries instead of only zeroing damage. Plus why the listen host had no drone on the first run."
date: 2026-11-24
workedOn: 2026-10-30
publishAt: 2026-11-24
track: "Pet drone follow"
category: "Pet Drone"
sidebar: "Part 1: Spawn and Follow"
image: /blog/pseudo-drone-follow-c.jpg
outline: deep
tags: [UE5, AI, State Tree, Character Movement, Multiplayer, GAS]
---

# Pet Drone, Part 1: A Flying Companion That Follows the Player in UE5 With a Plain AAIController, a State Tree and RequestDirectMove Steering

PSEUDO's player gets a small drone that hovers beside them, later shoots enemies and scans the area. This first part is the base: the drone exists, follows through running, jumping, falling and dashing without visible snapping, gets past walls, and is ignored by every attack. If you are adding a companion to a UE5 game, the parts that carry over are where its lifetime is owned (a component on the player state), how its brain is built (a plain `AAIController` with a two-state [State Tree](https://dev.epicgames.com/documentation/en-us/unreal-engine/overview-of-state-tree-in-unreal-engine) instead of a subclass of the enemy controller), and one steering lesson: `AddMovementInput` on a flying character overshot a falling owner by about three metres, and `RequestDirectMove` with a computed velocity did not.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-drone-follow-c.jpg" alt="The drone steers with a computed velocity, not movement input, so it keeps up without overshooting." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-drone-follow-c-dark.jpg" alt="The drone steers with a computed velocity, not movement input, so it keeps up without overshooting." loading="lazy">
</figure>

## What the drone had to do

I wrote down five tests before building it:

1. It hovers near the player from the start of play and follows through run, jump, fall and dash without visible snapping.
2. It does not get stuck behind walls, and it catches up when it falls far behind.
3. Enemies ignore it, and it takes no damage from a boss's area attack.
4. When the owner dies it disappears, and when the owner respawns a new one appears.
5. With a listen server and one client, the client sees the host's drone move smoothly.

## Lifetime belongs to the player state

The drone is spawned by a pet component on the player state, on the server. The player state outlives the pawn, which makes it the natural owner for "despawn on death, spawn again on respawn". The component listens to two things: `APlayerState::OnPawnSet` (a new live pawn means spawn, no pawn means despawn) and the dead tag on the owner's ability system component (the game's health set adds `State.Dead` when the player dies). The drone disappears in the same frame as the death, and a new one appears at its follow point after the respawn.

Which characters get a drone is data: the pawn data asset has a soft reference to a pet data asset. An empty field means no drone, so a hub character can go without one. The pet data holds the pawn class, the State Tree and every follow number (offset, speeds, distances).

### Why the listen host had no drone on the first run

On the first test run, the client had a drone and the host did not. The listen host's pawn is possessed before the world has begun play, and `UWorld::HasBegunPlay` only turns true after every actor's `BeginPlay` has run. The pet component's spawn on the host came too early. The fix was to defer the first spawn by one tick with `SetTimerForNextTick`. If your player-state component spawns things in response to the first possession, check the listen host separately: it gets that possession earlier than any client.

## A flying character with its own plain AI controller

The drone is an `ACharacter` subclass whose movement component starts in flying mode. It has its own ability system component (minimal replication) and a health set, so the combat code can read it like any other pawn. Its capsule only blocks static and dynamic world geometry: no pawns, no camera, no shots. The mesh has no collision. A small hover bob is applied through the mesh offset on every machine, which works with the smoothing that simulated proxies already get.

The game's enemy AI controller seemed like the obvious parent, but almost everything in it is enemy-only: senses, attack choice, shields, combat notifications. Subclassing it would mean bypassing most of what it does. What the drone shares with enemies is the State Tree schema, the style of the tasks and the ability system, not the controller. So the drone gets a plain `AAIController` with its own State Tree component, started on possession from the tree in the pet data. (The enemy side is in the [enemy AI State Tree build log](./2026-11-15-pseudo-enemy-ai-statetree-core).)

The tree has two states:

- **Follow**: fly to the follow point at follow speed. When the drone gets farther than 900 cm from it, the task succeeds and the tree moves to Return.
- **Return**: fly at catch-up speed until it is within 300 cm, then go back to Follow.

A task that fails also falls back to Follow. The tree is built from an editor utility function rather than by hand, so it can be rebuilt the same way.

## Steering: why AddMovementInput overshot

The first version moved the drone with `AddMovementInput` toward the follow point. When the owner fell, the drone shot past them by about 300 cm. In flying mode, the character movement component turns the velocity only through fluid friction, so a drone at full speed cannot change direction quickly when its target suddenly reverses or drops.

The version that works computes the velocity it wants and asks for it directly:

1. Wanted velocity = the owner's velocity plus a pull toward the follow point. Inside an arrive radius (60 cm) the pull scales down with distance, so the drone settles instead of circling.
2. Clamp it to the current state's maximum speed (follow or catch-up).
3. Move the current velocity toward it at a constant rate (`VInterpConstantTo`, 5000 cm/s²).
4. Pass the result to `RequestDirectMove`. The movement request is set not to use acceleration, so the requested velocity is applied as given.

Adding the owner's own velocity is what keeps it up with a dash or a fall: the drone moves with the owner first and corrects its position second. One more flag mattered: `bSetControlRotationFromPawnOrientation` is off on the controller, otherwise the yaw I set was overwritten.

In the movement test (run, sprint, jump, double jump, dash, a 180° camera flip, a 500 cm fall) the drone never left Follow, and on the client its visible speed peaked at about 1200 to 1280 cm/s, with no frame above 3000 cm/s.

## Getting past walls

The follow point is the owner's position plus an offset turned by the owner's yaw. A sweep from the owner to that point checks for walls. If it is blocked, the point moves to directly above the owner's head at the offset's height (or under the ceiling if that is blocked too). An earlier version used the hit location instead, which put the drone against the wall at body height.

Two problems came up in testing:

- **After a respawn, the drone sat inside the player.** The respawn put the owner inside the checkpoint's collision, every sweep started inside it, and the "blocked" result was used. Sweeps now ignore hits that start penetrating.
- **A drone stuck about a metre behind a thin wall never counted as stuck,** because it was close to its point. Now, if the sweep from the drone to its own point is blocked, a stuck timer runs whatever the distance, and after 2 s the drone teleports to the point. A drone farther than 2500 cm teleports at once.

In the wall tests, jumps of 1200 to 1700 cm went Return to Follow in 0.5 to 0.8 s with no teleport. A 3846 cm jump teleported at once. With a 22 m wall between them, the drone teleported 2 s after the owner moved. The teleport happens in plain view for now; a warp effect comes in a later part.

## An untargetable tag checked in every hit query

Enemies already ignored the drone without any team code: the enemy controller looks for targets among the players' pawns and drops perception updates for anything that is not a player character.

Attacks were another matter. The area-of-effect query and the melee sweep take every pawn that has an ability system component, and the drone has one. Only zeroing its damage would still play the hit cue, the hitstop and the stagger or knockback reaction on it. So the drone carries a `State.Untargetable` tag, and one helper checks it in the area query, in the melee trace and in the shot target check. As a safety net, the damage execution produces no output for an untargetable target, at the same spot that already handled shielded targets.

In a 20 s fight against the big brute boss and its minions, with ground slams, melee chains, a thrown rock and minion slams, both drones stayed at 100 health and never entered a reaction state, and every enemy focus was a player character. A damage spec applied straight to a drone left it at 100, while the same spec took a training dummy from 100 to 54. A greatsword area finisher swung with the drone 70 cm in front hit only the boss. (The area query itself is in the [AoE build log](./2026-11-18-pseudo-aoe-attacks-server-validated).)

## Where the drone sits, after three rounds of feedback

The design said "behind and to the right, about 150 cm up". In the first screenshot the drone sat next to the shoulder camera and filled the top right of the screen. After a few rounds it ended up at the player's upper left, a little behind: (-70, -100, 130) in the owner's frame. Only the data asset changed; the C++ default stayed as designed.

The yaw that turns the offset depends on whether a weapon is drawn:

- **Unarmed:** the camera's yaw, smoothed, so the drone circles with the camera while exploring.
- **Weapon drawn:** the body's yaw, unsmoothed, so in combat the drone stays fixed at the player's upper left and turns with them. The steering already keeps the flight smooth.

The drone faces the way the body faces in both modes. One round in between froze the offset in world space during combat. That was a misunderstanding of what I wanted, and it was replaced.

## What carries over

- Own a companion's lifetime from the player state, and treat the listen host's first possession as a special case.
- Do not subclass an AI controller full of logic the companion must switch off. Share the State Tree schema and task style instead.
- For a flying character that must track a target closely, compute the velocity and use `RequestDirectMove`; movement input in flying mode turns too slowly.
- Ignore start-penetrating hits in follow sweeps, and detect "stuck" by a blocked line to the goal, not only by distance.
- Make "untargetable" a filter in every hit query. Zero damage alone still plays cues and reactions.

Later, the drone's default movement settings caused one more bug in water: see [a flying character that bobs at the water surface](./2026-11-23-pseudo-flying-character-bcanswim-water-bob).

Next: [Part 2, the drone's attack](./2026-11-25-pseudo-pet-drone-attack-target-kill-credit), and [Part 3, the scan](./2026-11-25-pseudo-pet-drone-scan-custom-stencil-post-process).
