---
title: Pawn Class 3D Character
outline: deep
---

# Pawn Class 3D Character

*Unreal Engine 5, C++*

For this assignment I built a character controller on Unreal's bare `Pawn` class instead of the ready-made `Character` class. I assembled the components myself and routed input through the Enhanced Input System.

<video src="/projects/pawn-class-3d-character-1.mp4" controls muted playsinline style="width: 100%; max-width: 640px; height: auto;"></video>

## The base requirements

The root is a capsule collision component, with a skeletal mesh, a spring arm, and a camera attached to it. The GameMode's `DefaultPawnClass` points at the new Pawn. I turned off physics simulation on the capsule and mesh because movement is driven entirely by code.

`IA_Move` handles WASD and `IA_Look` handles the mouse. The assignment said not to use the engine's `AddControllerYawInput()` and `AddControllerPitchInput()`, so I compute yaw and pitch from the raw mouse input and rotate things myself. Movement and rotation both use `DeltaTime`, and the move direction comes from the Pawn's own forward and right vectors.

## Why a Pawn needs its own movement code

A `Character` comes with a `CharacterMovementComponent`, and `AddMovementInput()` feeds it. A bare `Pawn` has no movement component, so that call has nothing to hand the input to. I left the standard version in the file as a comment and wrote the replacement.

The input functions don't move anything. `Move()` and `Look()` only store the latest value, and `Tick()` applies it. I bound each action twice, once for `Triggered` to store the value and once for `Completed` to reset it to zero. If the reset is missing, the Pawn keeps drifting after you let go of the key.

In `Tick()`, movement is `AddActorLocalOffset()` with the stored input times `NormalMoveSpeed` (1000) times `DeltaTime`. Looking changes the spring arm's relative rotation, with pitch clamped to -60 to 30 degrees and yaw to plus or minus 60, so the camera swings around the body without flipping over.

## The extras

The required version only moves on a flat plane with no gravity. I went further in three ways, in a second Pawn class, `AAircraftPawnBaseCharacter`.

First, six degrees of freedom. Here the input actions are 3D vectors, not 2D. Move gets forward and back, strafe, and up and down. Look gets yaw, pitch, and roll. All of it is applied in the Pawn's local space, so travel follows the direction it faces, and the rotation goes to the whole Pawn so the camera follows.

Second, my own gravity and landing. Every frame the Pawn is pushed down by 980 units per second with `AddActorWorldOffset()`, with the sweep option on so it stops at geometry. It's a constant fall speed, not an acceleration, which is simpler but means a long drop feels the same as a short one.

To know whether it's on the ground, `CheckGrounded()` runs a sphere sweep 50 units along the Pawn's down direction, with a 40 unit radius, on the visibility channel, ignoring itself. A debug sphere shows the sweep, and a separate ground mesh turns visible when it hits. While grounded, gravity is skipped and any downward input is clamped to zero so the Pawn can't push into the floor.

Third, air control. While airborne, the movement speed is multiplied by `AirMoveSpeed`, which defaults to 0.5, and the grounded and airborne states are separate branches in `Tick()`. An on-screen message prints "AIR" or "GROUND", which helped a lot while tuning.

## Things I'd change

The ground check follows the Pawn's own down vector, but gravity always pulls along world down. When the Pawn is rolled or pitched, those two disagree, so the check can look at a different spot than the one the Pawn is falling toward. A velocity variable that accumulates gravity and resets on landing would also feel closer to a real jump.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_4) · [YouTube](https://youtu.be/r0LRk7ACkAY)
