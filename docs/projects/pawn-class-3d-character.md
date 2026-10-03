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

`IA_Move` handles WASD and `IA_Look` handles the mouse. The assignment said not to use the engine's `AddControllerYawInput()` and `AddControllerPitchInput()`, so I compute yaw and pitch from the raw mouse input and apply them with `AddActorLocalRotation()`. Movement and rotation both use `DeltaTime`, and the move direction comes from the Pawn's own forward and right vectors.

## The extras

The required version only moves on a flat plane with no gravity. I went further in three ways.

First, six degrees of freedom: forward and back, strafe, up and down, plus yaw, pitch, and roll, all in the Pawn's local space so travel follows the direction it faces.

Second, my own gravity and landing. A constant downward acceleration is applied each tick instead of using the engine's physics. A line or sweep trace detects the ground, and vertical velocity resets to zero on landing.

Third, air control. While airborne, speed drops to 30 to 50 percent of ground speed, and the grounded and airborne states are handled as separate branches.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_4) · [YouTube](https://youtu.be/r0LRk7ACkAY)
