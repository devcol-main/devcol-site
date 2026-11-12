---
title: "A Niagara Burn Effect With No Flames, and a Re-Activate That Crashed the UE5 Editor"
description: "PSEUDO's new Burn status showed its overlay but never any fire. The one emitter I'd kept from the source system was enabled for Low quality only, so at Medium the system had nothing to run and finished inside Activate. My finish handler then re-activated it synchronously and recursed until the stack overflowed."
date: 2026-11-09
workedOn: 2026-11-05
publishAt: 2026-11-09
track: "Burn status recursion crash"
category: "Debugging / VFX & Rendering"
sidebar: "Burn Status Recursion Crash"
outline: deep
tags: [UE5, Niagara, VFX, Debugging]
---

# A Niagara Burn Effect With No Flames, and a Re-Activate That Crashed the UE5 Editor

Enemies in PSEUDO show their status on the body: Poison, Slow and Burn each get a [Niagara](https://dev.epicgames.com/documentation/unreal-engine/overview-of-niagara-effects-for-unreal-engine) system attached to the skeletal mesh, with particles that follow the bones, plus a material overlay. The [Elements](/wiki/pseudo/systems/elements) page has what the statuses do in play. A component on every machine, `UPseudoStatusLookComponent`, watches the replicated status tags and spawns or removes the looks. No gameplay state lives there; it only follows the tags.

For Burn I wanted the body to look like it was on fire, so I started from the engine-style fire system `NS_Fire`, copied it, and cut it down to its `FlamesOnly` emitter, with the spawn moved onto the mesh bones. Poison and Slow, built the same day, worked straight away. Burn didn't.

## The symptom

- `PseudoStatus Status.Burn` on a test enemy gave the orange overlay, but no flames. `NiagaraComponent.is_active()` stayed `False`. There was no Niagara warning in the log.
- When I called `activate(True)` on the component from an editor Python script, the call came back "cancelled" and the editor died with a repeating stack:

```text
UPseudoStatusLookComponent::OnEffectFinished()
UPseudoStatusLookComponent::execOnEffectFinished()
UnrealEditor-CoreUObject.dll
UnrealEditor-Niagara.dll  (x3)
UPseudoStatusLookComponent::OnEffectFinished()
...
```

So there were two bugs: a system that wouldn't run, and a crash that only showed up because it wouldn't run.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | Removing the wind module also removed the spawn-rate scale | In the source, `System.ScaleSpawnRateByDistance` is set by a separate module | Ruled out |
| 2 | The `NET_Environment_Looping` effect type culls it at spawn | Switched to `NET_Gameplay_Looping` and retried | Ruled out (I kept the gameplay type anyway) |
| 3 | The scripts failed to compile | Compile state UpToDate, 0 errors in the stack issues | Ruled out |
| 4 | Level or view culling | Spawned the system at a location right next to the camera: also inactive | Ruled out |
| 5 | The emitter is disabled at this quality level | Emitter data: `FlamesOnly` has `qualityLevelMask` 1, Poison's emitter has 31. `fx.Niagara.QualityLevel` was 1 | **Confirmed** |
| 6 | My fix didn't work (still inactive after setting the mask to 31 and saving) | Restarted the editor: active | The saved mask only took effect after a restart |

Step 6 cost me a round. The fix was right the first time; the running editor just didn't pick up the changed mask until it was restarted, and that was also true for a fresh copy of the asset.

## The cause

**Why no flames.** `NS_Fire` has a GPU emitter for higher quality levels and `FlamesOnly` as its fallback for Low. When I removed the GPU emitter, I was left with a system that had no emitter allowed at Medium. A Niagara system with nothing to run completes during activation, without a word in the log.

**Why the crash.** `OnEffectFinished` is bound to the Niagara component's `OnSystemFinished` delegate and re-activates the status look when its system finishes. It called `Activate(true)` directly. When activation completes immediately, `OnSystemFinished` fires *inside* that `Activate` call, which calls `OnEffectFinished`, which calls `Activate` again, and so on until the stack runs out.

In the game itself, the delegate is bound after the first spawn, so the first activation could never reach this path. A later re-activation could: any status system that finished and then failed to start would have crashed a player the same way the editor crashed for me.

## The fix

**The asset.** On `NS_StatusBones_Burn`, the `FlamesOnly` emitter now has `qualityLevelMask` 31 (all levels) and dynamic bounds. The change lives in the asset build script, so a rebuild keeps it.

**The code.** The re-activation is deferred to the next tick:

```cpp
// Before
Effect->Activate(true);

// After: next tick, not now: a system that cannot run finishes inside Activate,
// and this would recurse until the stack overflows
GetWorld()->GetTimerManager().SetTimerForNextTick(
	FTimerDelegate::CreateWeakLambda(Effect, [Effect]() { Effect->Activate(true); }));
```

If a system can't run, it now finishes once per tick instead of infinitely within one call. The weak lambda also means nothing happens if the component is gone by then.

## Checking it

After an editor restart, Burn was active on both the server and the client, the flames were visible on the body and followed the animation, and they were removed when the status ended. Poison and Slow behaved the same way, and there was at most one system per status per enemy.

One honest gap: I didn't re-trigger the recursion after the fix. Now that the emitter runs, nothing finishes inside `Activate`, so the crash path can't be reached the easy way. The code fix is verified by reading the path, not by a test.

## What I took from it

**After cutting emitters out of a copied Niagara system, check the `Platforms` settings of what's left.** A system that's inactive with no log line is the signature of an emitter that isn't allowed at the current quality level.

**Never re-activate a Niagara component synchronously from `OnSystemFinished`.** The finish can happen inside the activation, and then the handler is calling itself.

**When an asset fix "doesn't work", restart before trying the next idea.** Some saved settings only count after a restart, and changing a correct fix because of that is how a short bug turns into a long one.
