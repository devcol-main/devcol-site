---
title: Pawn Class 3D Character
outline: deep
---

# Pawn Class 3D Character

*Unreal Engine 5, C++*

A custom character controller built from scratch on top of Unreal's bare `Pawn` class instead of the built-in `Character` class — assembling the collision, mesh, and camera components by hand and routing input through the newer Enhanced Input System.

<video src="/projects/pawn-class-3d-character-1.mp4" controls muted playsinline style="width: 100%; max-width: 640px; height: auto;"></video>

## What was built

- **Component setup from scratch** — a capsule collision component as the root, with a skeletal mesh, spring arm, and camera attached on top. `DefaultPawnClass` on the GameMode points at it, and physics simulation is turned off on both the capsule and mesh so movement is entirely code-driven rather than physics-driven.
- **Enhanced Input, done manually** — `IA_Move` and `IA_Look` input actions handle WASD and mouse input, but instead of leaning on the engine's `AddControllerYawInput()` / `AddControllerPitchInput()` helpers, yaw and pitch get computed directly from the raw mouse input and applied with `AddActorLocalRotation()`.
- **Frame-independent movement** — movement and rotation both run through `DeltaTime`, with move direction derived from the Pawn's own forward/right vectors rather than world axes.

## Going past the base requirement

The base assignment only asked for flat-plane movement and rotation, no gravity. It ended up going further in both directions:

- **Full 6-degree-of-freedom flight** — move and rotate on all six axes (forward/back, strafe, up/down, yaw, pitch, roll), all in the Pawn's local space rather than world space, so the direction of travel always matches the way it's currently facing.
- **A manual gravity and landing system** on top of that — a constant downward acceleration applied every tick (rather than using Unreal's built-in physics gravity), a line/sweep trace to detect when it's actually touching ground, and the vertical velocity getting zeroed out the instant it lands.
- **Air control** — movement speed drops to 30–50% of the grounded speed while airborne, with the grounded and airborne states handled as separate branches of logic rather than one blended formula.

## Links

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_4) · [YouTube](https://youtu.be/r0LRk7ACkAY)
