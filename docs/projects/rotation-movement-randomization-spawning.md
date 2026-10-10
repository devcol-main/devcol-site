---
title: Rotation, Movement, Randomization, Spawning
outline: deep
---

# Rotation, Movement, Randomization, Spawning

*Unreal Engine 5, C++*

This assignment was two small C++ Actor classes: a platform that spins and a platform that slides back and forth. The point was to practice `Tick`, `DeltaTime`, and the reflection system on objects you'd actually place in a level.

Each class has its own StaticMeshComponent and its own behavior. The rotating one calls `AddActorLocalRotation()` in `Tick()`. The moving one stores its start location and travels back and forth within a maximum range at a set speed. Both scale their motion by `DeltaTime`, so they move the same at any frame rate.

Rotation speed, move speed, range, and start position are all `UPROPERTY(EditAnywhere)`, so I could change them in the Details panel while the level was running and see the result immediately. I placed several instances with different values to check that two classes could cover a whole room of platforms.

There were two optional goals. The first was a timer, using `FTimerHandle` and `GetWorld()->GetTimerManager().SetTimer(...)` so an Actor can run code on a schedule instead of counting time every frame. The second was random generation: a spawner places Actors at runtime with `SpawnActor` at random positions, so each run builds a different course.

## The rotating platform

`ARotatingActor` has three booleans, `bRotateOnPitch`, `bRotateOnYaw`, and `bRotateOnRoll`, and one `RotationSpeed` that defaults to 100 degrees per second. Each frame it adds `RotationSpeed * DeltaTime` to every axis that's switched on. Because the axes are separate flags, the same class can be a spinning blade, a turntable, or a tumbling cube, depending on what you tick in the Details panel.

## The moving platform

`AMovingPlatformActor` moves on two axes at once. It slides along X and bobs along Z, each with its own speed and its own direction flag. When the platform passes `StartLocation` plus or minus `MaxRange` on an axis, that axis flips direction. Setting a speed to zero turns that axis off, which is why the code checks `IsNearlyZero()` first.

Two details I ran into:

- `BeginPlay()` calls `SetActorLocation(StartLocation)`, so every instance snaps to its `StartLocation` value when the game starts. The position you drag it to in the editor doesn't matter unless you also set `StartLocation`.
- The movement uses `AddActorLocalOffset()` but the range check reads the world location. On an unrotated platform they match. On a rotated one, local X isn't world X, so the bounce points drift. Using world offsets, or comparing in local space, would make it consistent.

## Practice with the reflection macros

`AItem` is the class where I tried each reflection specifier to see what it did in the editor:

- `EditDefaultsOnly` lets you change a value on the Blueprint class but not on placed instances.
- `VisibleAnywhere` shows a component in the Details panel without letting you edit it.
- `BlueprintCallable` exposes `ResetActorPosition()` as a node that Blueprints can call.
- `BlueprintPure` exposes the `GetRotationSpeed()` getter as a node with no execution pin.
- `BlueprintImplementableEvent` makes `OnItemPickedUp()` something C++ calls and the Blueprint fills in. `BeginPlay()` calls it.

## Timer and random spawning

`ARandomActor` sets a repeating timer in `BeginPlay()`. Once a second the timer calls `MoveRandom()`, which teleports the Actor to a random point using `FMath::FRandRange()`. The range is `MinRandom` to `MaxRandom` (50 to 200 by default) on each axis, and both are editable properties.

`ASpawnActor` is the spawner. It holds three `TSubclassOf<AActor>` properties, a random Actor, a moving platform, and a rotating platform, and a `SpawnCount` that defaults to 3. In `BeginPlay()` it loops over each class and calls `SpawnActor` that many times at a random location in the same range. Since the spawner takes a class and not a fixed type, I could swap in a Blueprint child of any of them without touching the C++.

## Limits

The random range only covers positive coordinates, so everything lands in one small area near the origin and the platforms overlap. The spawn loop is also written out three times, once per class, and would be shorter as one helper that takes the class and the count.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_3) · [YouTube](https://youtu.be/ih6_73y3hsw)
