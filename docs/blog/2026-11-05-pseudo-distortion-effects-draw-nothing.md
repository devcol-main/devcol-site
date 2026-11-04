---
title: "Distortion Effects That Drew Nothing: r.RefractionQuality and Medium Scalability"
description: "No refraction material in PSEUDO bent the view in PIE, whatever the material did. The engine's scalability settings set r.RefractionQuality to 0 at Low and Medium effects quality, the editor runs Medium, and at 0 the renderer skips the distortion pass entirely."
date: 2026-11-05
publishAt: 2026-11-08
track: "Distortion effects draw nothing"
outline: deep
tags: [UE5, Rendering, VFX, Niagara, Debugging]
---

# Distortion Effects That Drew Nothing: r.RefractionQuality and Medium Scalability

The greatsword in PSEUDO leaves a trail on each swing. For the heavy attacks I tried a distortion trail from a VFX pack, `NS_SlashTrail_Distortion_Only_Loop`: no color, only a ribbon that bends the view behind it. On the test map I couldn't see it at all, also after widening it to 120. I noted it as "judge on a detailed background" and moved on. The gravity lens and ripple effects I'd made earlier were in the same state: still waiting for me to judge them.

When I came back to restyle the trails and add a distortion trail to the dash, I put the effect in front of a detailed background, and it still drew nothing. This time I went looking.

## The symptom

- **Repro**: `L_Test_Combat`, PIE in any net mode, `sg.EffectsQuality` 1, a translucent material with `Refraction` (any method) in front of a detailed background.
- **Expected**: the view behind the material shifts.
- **Observed**: no change at all.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The pack material has no bend | `MI_SlashTrail_Distort_1`: its distortion multiplier is 0, refraction mode is IOR | True, but not the whole story |
| 2 | My new material is wrong | My own material (Pixel Normal Offset, normal from a lens shape) on the trail: screenshot diff with the trail on and off was 0 pixels | Ruled out by 3-5 |
| 3 | Unlit materials ignore refraction under Substrate | Throwaway test materials on a cube: unlit Pixel Normal Offset, default-lit Pixel Normal Offset, unlit "Before DOF" | All drew nothing |
| 4 | A method that needs no normal works | `RM_2D_OFFSET` with a constant offset | Drew nothing either: the pass itself is off |
| 5 | A show flag or cvar | `r.DisableDistortion` 0 and `ShowFlag.Refraction` 1: no change. In the engine source, `ShouldRenderDistortion()` returns false when `GetRefractionQuality(ViewFamily) <= 0` | `r.RefractionQuality` was 0: **confirmed** |
| 6 | Scalability sets it | `BaseScalability.ini`: `[EffectsQuality@0]` and `[EffectsQuality@1]` both set `r.RefractionQuality=0`; the editor runs `sg.EffectsQuality` 1 | **Root cause** |

Step 4 was the turning point. A 2D offset with a constant value doesn't depend on normals, lighting or the shading model. When even that drew nothing, the problem couldn't be in any material, and I stopped tuning materials and started reading the renderer.

## The cause

In `DistortionRendering.cpp`, `FDeferredShadingSceneRenderer::ShouldRenderDistortion()` skips the whole distortion pass when `r.RefractionQuality` is 0 or less. The engine's own scalability file sets it to 0 for effects quality Low and Medium, and the editor viewport runs at Medium.

So at those settings no refraction material is ever composited, and nothing in the material or the Niagara system can bring it back. The trail was invisible in the editor from the start, and the gravity lens and ripples very likely were too.

## The fix

A new `Config/DefaultScalability.ini` in the project:

```ini
[EffectsQuality@0]
r.RefractionQuality=2

[EffectsQuality@1]
r.RefractionQuality=2
```

It's read at startup, so the editor has to be restarted after changing it.

There is a cost: Low effects quality is no longer quite the cheapest it could be. The distortion pass only runs when a distorting primitive is on screen, though, and without this setting nobody on Low or Medium would see any of these effects. If I later decide Low should be as cheap as possible, deleting the file restores the engine's defaults.

## Checking it

After a restart, `sg.EffectsQuality` was 1 and `r.RefractionQuality` 2. The 2D-offset test panel shifted the checker wall behind it as soon as `r.RefractionQuality 2` was typed in the console. The new sword distortion trail then changed 16 303 pixels on the first light attack between distortion on and off.

## What I took from it

**A distortion effect that shows nothing: check `r.RefractionQuality` first.** It's one console command, and it would have saved me tuning materials against a pass that wasn't running.

**Find the simplest version of the effect that should work.** A constant 2D offset has no moving parts. When it fails too, the problem is below the material.

**Measure distortion, don't eyeball it.** Pause a frame, hide and show the component, and diff the two images. By eye on a flat floor and an open sky, a working distortion and a missing one look the same, which is exactly how this one stayed hidden the first time.
