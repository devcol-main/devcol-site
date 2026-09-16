---
title: Building an Unreal Engine 5 FPS in 5 Days
outline: deep
---

# Building an Unreal Engine 5 FPS in 5 Days

*Unreal Engine 5, Blueprint*

With zero prior Unreal Engine experience, this FPS was built from scratch in five days. Time was tight and development was chaotic, but it was a great challenge.

![Building an Unreal Engine 5 FPS in 5 Days gameplay screenshot](/projects/fps-5-days-1.png)

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
<iframe src="https://www.youtube.com/embed/LYvmCeML3t0" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe>
</div>

## What was implemented

- **Animations & state machine** — Idle, Walk, Run, Jump, Fall, and Land states via Blend Space, with a State Alias so Fall/Land transitions trigger automatically based on the Sequence Player rule. Sprint (Shift, reverts to walking on release) and jump (Space) mapped to input.
- **Environment & lighting** — A dark, moody, crimson map, with a Post-Process Volume to make emissive materials and glowing elements pop against the darkness.
- **Map flow** — Loading Scene → Video Screen → Main Menu → Lab (Level 1) → Egypt (Level 2).
- **Enemy AI (the Ant)** — A light source attached to the mesh for visibility in dark maps; blood-splatter particles and spatial audio with randomized pitch on hit; the enemy speeds up when it spots the player or takes damage; on collision it explodes and knocks the player back via Launch Character with randomized force. Health shows on a billboarded World Space UI bar that always faces the camera.
- **Interactive items** — Point lights and particle effects on pickups; ammo pickups float up and down via InterpToMovement; health pickups get their own custom movement.
- **Player mechanics & audio** — A toggleable flashlight bound to F with a clicking sound; custom Anim Notifies for footsteps (avoiding glitches like a footstep looping mid-air after a jump), blended with a Sound Modulator and random pitch for variation; randomized pitch on rifle fire, dry fire, and background music via Sound Cues.

## Cut for time

Advanced animation blending for mid-run jumps/landings, landing sound effects, destructible barrels, and physics-based hazards like swaying bridges — backlogged for a future pass.

## Retrospective

No time went into clean architecture or optimization — the focus was cramming in as many features as possible to see what worked, and it was a lot of fun. Starting late on a Sunday night cost some time that could've gone toward a wider variety of item drops and enemy types, and the recording came out lower quality than expected — worth fixing before the next video devlog.

## Links

[GitHub](https://github.com/devcol-main/FirstUE5FPS) · [itch.io](https://devcol.itch.io/first-time-unreal-engine5-within-5day) · [Video](https://youtu.be/LYvmCeML3t0)
