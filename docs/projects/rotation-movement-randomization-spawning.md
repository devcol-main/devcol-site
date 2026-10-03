---
title: Rotation, Movement, Randomization, Spawning
outline: deep
---

# Rotation, Movement, Randomization, Spawning

*Unreal Engine 5, C++*

This assignment was two small C++ Actor classes: a platform that spins and a platform that slides back and forth. The point was to practice `Tick`, `DeltaTime`, and the reflection system on objects you'd actually place in a level.

Each class has its own StaticMeshComponent and its own behavior. The rotating one calls `AddActorLocalRotation()` in `Tick()`. The moving one stores its start location and travels back and forth within a maximum range at a set speed. Both scale their motion by `DeltaTime`, so they move the same at any frame rate.

Rotation speed, move speed, range, and start position are all `UPROPERTY(EditAnywhere)`, so I could change them in the Details panel while the level was running and see the result immediately. I placed several instances with different values to check that two classes could cover a whole room of platforms.

There were two optional goals. The first was a timer. Using `FTimerHandle` and `GetWorld()->GetTimerManager().SetTimer(...)`, a platform can disappear after a delay, which is cheaper than checking elapsed time every frame. The second was random generation: platforms spawn at runtime with `SpawnActor` at random positions, and `FMath::RandRange` picks their speed, range, and rotation, so each run builds a different course.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_3) · [YouTube](https://youtu.be/ih6_73y3hsw)
