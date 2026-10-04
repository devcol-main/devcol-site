---
title: "Server-Side Damage and Hit Detection for Melee Abilities"
description: "How I built hit detection for two Unreal Engine 5 melee abilities: frame windows read from the montage, per-frame sphere sweeps along the foot bone, once-per-target hits, team rules, input locking, and what each approach costs."
date: 2026-10-03
outline: deep
---

# Server-Side Damage and Hit Detection for Melee Abilities

Tumble Teams has two melee attacks: a drop kick (right-click) and a primary kick (left-click). This is how their hit detection works, why I did it in code instead of animation notifies, and what it costs.

## Overview

The server reads the **montage's playback position** to know when the hit window is open. During the window, every frame it sweeps a sphere from the attack bone's previous position to its current position and applies **damage (not to teammates)** and **knockback (including teammates)** to anything it overlaps. There are no animation notifies. The logic lives in one struct, `FTumbleSweepHitTracker`, that both abilities share.

```
Input (right/left click) -> PlayerController -> ActivateAbility(tag)
  GameplayAbility (LocalPredicted)
    [owning client + server]  commit cost/cooldown, PlayMontageAndWait
    [server only]             every frame: FTumbleSweepHitTracker::Step
        sphere sweep (Pawn object type) -> hit each target once
        damage -> TakeDamage -> health effect     knockback -> LaunchCharacter
```

## How a hit is decided

### The window comes from the montage

Animations run at 60 fps, so a frame number divided by 60 is seconds. The drop kick's window is the right foot from frame 65 to 95 (about 1.08 to 1.58 s); the primary kick's is the right foot from frame 30 to 60. All of these are `EditDefaultsOnly`, so they can be tuned in the ability Blueprint without touching code.

I picked frames by measuring bone positions and speeds per frame rather than eyeballing. For the drop kick clip: 0 to 15 standing, 15 to 48 wind-up, **48 to 87 airborne kick** (foot height up to 115, speed up to about 560), 87 to 108 landing, 108 to 150 prone. When I first used the frame numbers from the previous animation, the window landed on the wind-up, so the kick connected with no hit registered.

### Sweep, don't sample

Every frame, the attack bone's position is read and a 30 cm sphere is swept from last frame's position to this frame's (`SweepMultiByObjectType`, Pawn objects only). Checking a single point would let a fast-moving foot **tunnel** through a target between frames. The first frame of a window has no previous position, so it's a point check, and the previous position is dropped (`BreakSweep()`) when the window ends or the bone changes.

### Each target is hit once

Hit characters are recorded in a `TSet` of weak pointers and also added to the query's `IgnoredActors`, so overlapping frames can't double-hit, and later sweeps don't even consider that target. Several different targets can still be hit by one kick.

### Damage, team rules, and knockback

- Damage goes through `UGameplayStatics::ApplyDamage` into the existing health effect (see the [health post](./2026-10-02-tumble-teams-gas-health-and-head-ui)). Drop kick does 20, primary does 10. **Same team means zero damage**, where "same team" requires both team indexes to be assigned and equal.
- Knockback uses `LaunchCharacter` along the attacker's horizontal facing, and **teammates still get knocked back**. The drop kick is 900 forward plus 300 up (about 270 cm in practice); the primary kick is 450 plus 150 (about 68 cm). Because both speed and hang time halve, distance drops to roughly a quarter, not a half.
- Gotcha: `LaunchCharacter` with zero strength still overwrites XY velocity, **stopping the target**. So it's only called when strength or lift is above zero.

### The server decides

The ability is `LocalPredicted`: the owning client plays the montage immediately, and the server validates and plays it too, replicating the montage to others. **Hit decisions only run on the server** (`HasAuthority`), so a client can't fake them. If the server rejects the activation (cooldown or stamina mismatch), the owner might still see one montage play, but no damage lands.

A subtle one: a server only updates a mesh's bone transforms if it's visible or told to. At hit-window start the ability sets the mesh's `VisibilityBasedAnimTickOption` to `AlwaysTickPoseAndRefreshBones`, and restores the character's default when it ends. I originally set this in the C++ constructor, but the character Blueprint had saved its own value, which silently overrode it, so it's set at runtime now.

## Why code instead of notifies

| | Code windows (now) | Animation notifies (before) |
|---|---|---|
| Choosing the window | frame values on the ability | notifies placed on each montage |
| Swapping the animation | re-pick frame numbers | re-author notifies on the new montage |
| Foot position | read from the bone every frame (sweep) | sampled at the notify |
| Where it runs | on the ability, on the server | requires the server's anim instance to fire the notifies |

The old primary attack hit via a notify on a different montage. The new kick montage has none, so I moved the primary to the same code path: a C++ parent class that runs the Blueprint ability graph first (which plays the montage), then starts server-side hit tracking from the active montage. The Blueprint graph isn't touched.

## What it costs

- A kick sweeps about 30 times (0.5 s of window at 60 fps), on the server only, with one sphere against Pawn objects. A few dozen microseconds each. Drop kick has a 5-second cooldown. That's the standard pattern for server-authoritative melee, and the cost isn't a problem.
- Two things did bother me: the per-frame debug drawing (compiled only for development builds, with a console variable `Tumble.AttackSweep.Debug` to switch it off), and the mesh tick option being left on after a kick, which was a real waste. It now restores when the ability ends.
- I chose *not* to lower hit-testing to 30 Hz: tiny savings, and a fast swing would get a coarser hit shape.

## Locking movement during an attack

Letting players run and spin the camera while a kick is active made the foot's swept path huge. The rules I settled on: lock movement **until the end of the hit window** (a lock through the full 3-second montage hurts pacing), lock movement fully, and cancel the attack when the attacker is hit or dies.

- A small `FTumbleAttackLock` acquire/release pair increments a counter on the character, so two abilities locking at once don't release each other. First lock calls `SetIgnoreMoveInput(true)`; the last release undoes it.
- **The camera stays free, but the body stops following it.** `SetIgnoreLookInput` also freezes the camera, so I left look input alone and turned off `bUseControllerDesiredRotation` and `bOrientRotationToMovement` for the duration, restoring defaults afterward, so the body turns smoothly back to the camera.
- Jumping is blocked separately in `CanJumpInternal`.
- Getting hit cancels attack abilities through their tags in `TakeDamage`. Death goes through the same path. `EndAbility` clears the timer and releases the lock on every exit route, and `UnPossessed` and `EndPlay` force-release as a safety net, since the ASC outlives the pawn.

## Traps I hit

| Symptom | Cause and fix |
|---|---|
| Animation and cooldown worked but no damage | `SetTimer` with a rate of 0 deletes the timer instead of making one. Re-arm each frame with `SetTimerForNextTick` |
| Stamina cost didn't apply | The old `RestoreStamina` ignored negative amounts. Cost now goes through a cost effect |
| Server saw stale foot positions | The Blueprint's saved mesh tick option beat the constructor. Set at runtime, restore after |
| Target froze at zero knockback | See `LaunchCharacter` above |
| Changing the clip made the window wrong | Frame values belong to a specific animation. Re-measure |

How I tested hits without clicking: activating abilities directly through the ability system component from editor Python, against a throwaway character spawned in the editor level before PIE (with auto-possess disabled, since an AI controller possessing it tripped an assertion in the local-input setup). A controller-less target is in `MOVE_NONE`, so `LaunchCharacter` does nothing until it's set to walking. Don't save the level afterward.

## Results

The server-path checks passed: one `TakeDamage` per kick, stamina 100 to 80 through the cost effect, a second activation in the same tick blocked by the cooldown tag, 270 cm knockback after refactoring into the shared tracker (unchanged), and primary doing 10 damage with no knockback.

Open items: the real click path from input to ability needs a human; same-team behavior, the client case in two-player PIE, and ability behavior at different montage play rates aren't verified yet. Also, the lock releases at the end of the hit window but the montage plays on, so there are roughly 1.7 to 1.9 seconds of free movement under an unfinished animation, which can look like foot sliding. Blending the montage out when movement resumes is the likely fix.
