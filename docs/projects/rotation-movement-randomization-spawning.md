---
title: Rotation, Movement, Randomization, Spawning
outline: deep
---

# Rotation, Movement, Randomization, Spawning

*Unreal Engine 5, C++*

Two small C++ `Actor` classes — a rotating platform and a moving platform — used as a vehicle for the core structure that basically every dynamic puzzle object in Unreal ends up needing: `Tick`, `DeltaTime`, and the reflection system.

## What was built

- **Two distinct Actor classes**, each with its own `StaticMeshComponent` and its own behavior: one spins continuously via `AddActorLocalRotation()` in `Tick()`, the other shuttles back and forth between a stored start location and a max range, both driven by `DeltaTime` so the motion holds up regardless of frame rate.
- **Everything that matters is a `UPROPERTY(EditAnywhere)`** — rotation speed, move speed, travel range, starting position. All of it is tunable straight from the Details panel while the level is playing, no recompiling needed to retune a platform's feel.
- **Multiple instances placed in a level**, each with different speed/range/rotation values, to confirm the same two classes could carry a whole room of platforms, traps, and elevators without turning into one-off scripts per object.

## Stretch goals

- **Timer-based logic instead of polling every tick** — `FTimerHandle` and `GetWorld()->GetTimerManager().SetTimer(...)` drive things like a platform disappearing after a delay, which is cheaper than checking an elapsed-time condition every single frame.
- **Randomized puzzle generation** — platforms get spawned at runtime via `SpawnActor` at randomized locations, with `FMath::RandRange` driving their speed, range, and rotation, so the same two Actor classes produce a different puzzle layout on every playthrough instead of a fixed, memorizable one.

## Links

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_3) · [YouTube](https://youtu.be/ih6_73y3hsw)
