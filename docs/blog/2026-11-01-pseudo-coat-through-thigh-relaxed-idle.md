---
title: "The Coat Wasn't Clipping, the Idle Was: Telling Chaos Cloth from Animation in UE5"
description: "Right after spawning in PSEUDO, the player's thigh poked out in front of the coat. Three cloth-side fixes changed nothing, because with the simulation turned off the animation pose itself put the thigh there. The one-check test that settles cloth versus animation, a 10-degree edit to the idle, and loosening the coat's swing to 60 degrees."
date: 2026-11-05
workedOn: 2026-11-01
publishAt: 2026-11-05
track: "Coat through the thigh"
category: "Debugging / Animation & Cloth"
sidebar: "Coat Through the Thigh"
outline: deep
tags: [UE5, Chaos Cloth, Animation, Python, Debugging]
---

# The Coat Wasn't Clipping, the Idle Was: Telling Chaos Cloth from Animation in UE5

This is the second coat bug of the day. The [first one](./2026-11-01-pseudo-coat-shards-anim-drive) was the coat shattering into shards after a fresh spawn, and once that was fixed the coat held together. Two things were still wrong with it, though. Right after spawning, standing still, the coat looked pierced by the thigh. And after all the work to calm it down, it now flapped too little.

The second one was a tuning change. The first one cost me three wrong guesses, all on the cloth side, before a single check showed it wasn't the cloth at all.

## The symptom

- **Observed**: at spawn, standing still with the sword stowed, the coat's front panel sat behind the thigh, so the leg looked like it was coming through the coat.
- **Not affected**: other idles. After moving around or after combat the character settles into a different idle, and there the coat covered the leg as it should.
- **Also**: the coat swung less than I wanted.

## What I tried

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The cloth starts in the reference pose, inside the legs | Forced a cloth teleport-and-reset after spawn (next tick and again at 0.5 s) | No change, code reverted |
| 2 | The stowed greatsword's blade by the leg | Tilted the stowed sword 40 degrees in its weapon data | Coat unchanged, sword looked wrong; reverted |
| 2b | The leg collision capsules are too thin | A copy of the cloth collision with thicker capsules (thigh 9.5 -> 13, calf 8.6 -> 10.5), checked from a fixed front camera in PIE | No change; unassigned, copy deleted |
| 2c | The skinned pose itself | Turned the cloth simulation off in the relaxed idle | **Confirmed**: the thigh is still in front of the panel |

Guess 2 deserves a word. There was a white shape next to the leg in my screenshots, and that really was the stowed sword's blade. But it wasn't the thing that bothered me, and tilting the sword out of the way only made the sword look wrong.

Guess 1 came straight from the [shards bug](./2026-11-01-pseudo-coat-shards-anim-drive), where the coat's state at spawn was the whole story. It was a reasonable guess with that bug fresh in mind, and it was wrong.

Check 2c is the one I should have run first. With the simulation off, the coat is just a skinned mesh following the bones. In the relaxed idle the thigh was still in front of the front panel. In the idle after moving, the panel covered the thigh. If the skinned pose clips, no cloth setting can fix it.

## The cause

The stowed stance plays `TB_Idle_Relaxed` as its idle. That animation turns the left thigh forward and outward further than the coat's skin weights follow, so the skinned front panel ends up behind the thigh.

The coat is deliberately kept close to its skinned position: a Max Distance cap limits how far each point may move from where the animation puts it, which is what keeps the swing under control. So the simulation stays near the skinned pose, and the skinned pose has the panel behind the leg. The cloth was doing exactly what I'd told it to.

## The fix

I edited the idle animation in place (the original is in git if I want it back). Every frame of the `thigh_l` track is rotated -10 degrees around the component's left/right axis, which swings the left leg back:

- knee forward offset: 21 cm -> 14 cm
- foot: 25 cm -> 11 cm in front of the hip
- foot about 3 cm lower, which foot IK takes care of by keeping it on the ground

I did it from Python: read each frame's local bone keys with `AnimationLibrary.get_bone_pose_for_frame`, apply the rotation with the axis mapped into the pelvis frame of frame 0, and write the track back with `AnimSequencerController.set_bone_track_keys`. The same animation is also the idle sample in the stowed locomotion blend space, so the blend space got the fix too.

I checked the edited idle from the front and from the side, and the panel is back in front of the thigh.

I'd just tried three fixes on the cloth side. A 10-degree change to one bone in one idle is small, easy to redo with a different angle, and leaves the cloth settings alone.

## Loosening the swing to 60 degrees

The other complaint was that the coat now swung too little. The cap on how far the cloth can move is set as a ratio of each point's depth below the top of the free part of the coat. A swing of angle A around that top point moves a point by `2 x depth x sin(A/2)`, so the ratio for N degrees is `2 x sin(N/2)`:

- 45 degrees: 0.77 (the old value)
- 60 degrees: `2 x sin(30) = 1.0`

The tool that applies the cap can only lower values, so I copied the Max Distance map from the original Twinblast mesh again and capped it at 1.0. Then I made the coat react more to movement:

| Setting | Before | After |
|---|---|---|
| Linear velocity scale | 0.05 | 0.15 |
| Angular velocity scale | 0.05 | 0.15 |
| Fictitious angular scale | 0.1 | 0.3 |
| Damping / local damping | 0.3 | 0.2 |
| Anim drive | 0 | 0 (stays off, see the shards bug) |

Both the player mesh and the headless variant got the same changes.

## Checking it

My cloth probe, on a listen server with the host driven through a fixed movement sequence, from a fresh PIE after saving (the lesson from the shards bug). Maximum single particle / maximum hem average, in degrees from vertical:

| Phase | Result |
|---|---|
| Idle | 35 / 15 |
| Strafe | 63-64 / 41-43 |
| Zig-zag | 66 / 41 |
| Run | 46 / 38 |
| Dash | 60 / 54 |
| Stop | 34 / 28 |

The dash shows the change most clearly: its hem average went from about 46 degrees with the old cap to 54. The coat stayed intact, no shards, while zig-zagging and dashing.

## What I took from it

**For a clipping report, turn the cloth off first.** `disable_cloth_simulation` on the skeletal mesh component in PIE takes seconds. If the skinned pose clips too, it's the animation, and every cloth setting is the wrong place to look. I spent three attempts learning that.

**A tight cloth cap makes the animation responsible.** Keeping the coat near its skinned pose is what stops it folding over, but it also means a bad pose shows straight through. When the cloth is constrained this hard, the idles need to be checked with the coat in mind.

**Write the formula down with the value.** "0.77" in a config means nothing a week later. "0.77 = 45 degrees, ratio = 2 x sin(N/2)" means I can change the swing in a minute.
