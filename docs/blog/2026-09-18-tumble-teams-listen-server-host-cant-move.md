---
title: "Why Only the Listen-Server Host Couldn't Move"
description: "A classic Unreal Engine multiplayer trap: BeginPlay runs before Possess, so IsLocallyControlled() is false for the host's own pawn. How I diagnosed it from log files and moved input setup to PossessedBy and OnRep_Controller."
date: 2026-09-18
outline: deep
---

# Why Only the Listen-Server Host Couldn't Move

While testing the quick-play match flow with several windows, I hit a bug that only affected one player: **whichever window clicked Quick Play first and became the listen-server host couldn't move its character.** WASD did nothing. Every client that joined afterward moved fine.

(To iterate faster I'd temporarily lowered the game mode's required player count from 4 to 2. That's unrelated to the bug; it only gates when the match starts, not pawn spawning or input.)

## Diagnosing without a debugger connection

My editor tooling can only introspect the main editor process. The windows I was testing in, launched as separate standalone processes, are separate executables I couldn't query live. So I compared their log files directly (`Saved/Logs/<Project>_N.log`) after the match started.

Only the clients logged these two lines right after the match went `InProgress`:

```
LogViewport: Viewport MouseLockMode Changed, DoNotLock -> LockOnCapture
LogViewport: Viewport MouseCaptureMode Changed, NoCapture -> CapturePermanently
```

The host never switched into game input mode at all. Diffing logs from two instances turned out to be a perfectly good diagnostic when live inspection isn't available.

## The cause

My character's `BeginPlay` did its local-only setup behind a guard:

```cpp
void ATumbleCharacter::BeginPlay()
{
    Super::BeginPlay();
    if (IsLocallyControlled())
    {
        // add the Enhanced Input mapping context
        // PC->SetInputMode(FInputModeGameOnly());
    }
}
```

Reading the engine source for the spawn order explained everything:

- `AGameModeBase::RestartPlayerAtPlayerStart` calls `SpawnDefaultPawnFor` first. The world has already begun play, so the freshly spawned pawn's `BeginPlay` runs **immediately**.
- Only afterwards does `FinishRestartPlayer` call `Possess()`.
- `APawn::IsLocallyControlled()` is basically `GetController() && GetController()->IsLocalController()`, and during `BeginPlay` the controller is still null.

So on the host, which runs spawn and possess locally in that exact order, the check is always false at `BeginPlay` and the whole block is skipped. Remote clients get the pawn through replication, and the server has already possessed it by the time its initial state is sent, so the controller is set in the very first state they receive. For them the check passes. That's why the bug only appears for the host's own pawn, and why a single-player test or a pure remote-client test never reveals it.

## The fix

Move the local-only setup to the two places where the controller is guaranteed to exist:

- `PossessedBy`, which covers the server and host path.
- `OnRep_Controller`, which covers the remote client path (`PossessedBy` only runs with authority).

```cpp
void ATumbleCharacter::SetupLocalPlayerInput()
{
    if (!IsLocallyControlled()) return;
    // add mapping context, set game-only input mode
}

void ATumbleCharacter::PossessedBy(AController* NewController)
{
    Super::PossessedBy(NewController);
    if (ASC) { ASC->InitAbilityActorInfo(this, this); }
    SetupLocalPlayerInput();      // server / host
}

void ATumbleCharacter::OnRep_Controller()
{
    Super::OnRep_Controller();
    if (ASC) { ASC->InitAbilityActorInfo(this, this); }
    SetupLocalPlayerInput();      // remote clients
}
```

The ability system's `InitAbilityActorInfo` belongs in the same two places for the same reason. After the change the host moved normally.

## Two other notes

If a hot reload fails with "Build failed without diagnostic output", check whether another running game process is holding the module's DLL before suspecting a compile error. That was the cause here.

And if I write `IsLocallyControlled()` inside `BeginPlay` again, I should stop and ask whether the controller exists yet. If the code needs a controller, `BeginPlay` is the wrong place for it.
