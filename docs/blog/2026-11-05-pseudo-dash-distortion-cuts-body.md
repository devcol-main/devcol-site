---
title: "A Dash That Cut the Player in Half: A Niagara Refraction Ribbon Edge-On to the Camera"
description: "Once refraction finally drew in PSEUDO, the dash's distortion ribbon started erasing half of the player's body at some camera angles. A flat refraction sheet in front of the body can't be kept off the camera ray in third person, so I removed it from the dash, and fixed the rebuild script that had left stray copies behind."
date: 2026-11-09
workedOn: 2026-11-05
publishAt: 2026-11-09
track: "Dash distortion cuts the body"
outline: deep
tags: [UE5, VFX, Niagara, Rendering, Animation, Debugging]
---

# A Dash That Cut the Player in Half: A Niagara Refraction Ribbon Edge-On to the Camera

PSEUDO's dash had a distortion trail: a [Niagara](https://dev.epicgames.com/documentation/unreal-engine/overview-of-niagara-effects-for-unreal-engine) ribbon, `NS_DashTrail_Distortion`, spawned by a timed notify on the `root` bone at mid-body height on the dash [montages](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-montage-in-unreal-engine). For a long time it didn't matter what that ribbon did, because no distortion effect drew anything in the editor. That story is in [Distortion Effects That Drew Nothing](./2026-11-05-pseudo-distortion-effects-draw-nothing). Once I forced `r.RefractionQuality` on, every [refraction](https://dev.epicgames.com/documentation/unreal-engine/using-refraction-in-unreal-engine) effect in the game came to life, the dash ribbon included.

The same day, looking at screenshots from a play session, I saw the left half of the player's body missing mid-dash. The rest of the frame looked normal.

## The symptom

- **Repro**: PIE, dash forward with the camera behind and slightly to the side of the player. Refraction has to be on (`r.RefractionQuality` above 0).
- **Expected**: the whole body stays visible in every dash section, from every camera angle.
- **Observed**: at some angles, half the body is gone for part of the dash.

The [Defense](/wiki/systems/defense) page has the dash rules; nothing about them changed here. This was purely a visual problem.

## What I ruled out

There were really only two questions, and both came back yes.

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The dash distortion ribbon refracts the body away | Paused mid-dash and took two screenshots of the same frame: once with the distortion component visible, once with it hidden | **Confirmed** |
| 2 | Old copies of the distortion notify survive my montage rebuilds | My rebuild script's `clear_fx` step only removed one-shot notifies (`notify`), not notify states (`notify_state_class`). The montage editor had spread the distortion state onto extra tracks when saving, and the rebuild never removed those | **Confirmed** |

The paused-frame comparison found the first one in a single step. The second one meant that removing the notify in the script wouldn't have been enough on its own: the stray copies would have stayed on the montages.

## The cause

A distortion material doesn't draw color of its own. Every pixel it covers shows the scene color from a slightly offset position, offset along the ribbon's normal. When the ribbon lies edge-on between the camera and the body, the pixels of the body behind it get replaced with background pixels from the side. From the camera, that looks like half the body disappearing.

No offset or width tweak gets around this. In a third-person view, a ribbon that flat, that close to the body, will always cross the camera ray at some angle. No tweak keeps it out of the way for every camera position.

## The fix

- **The dash no longer has a distortion trail.** The build script for the dash effects has a `DASH_DISTORTION_ENABLED` switch, now `False`, and `build_dash()` no longer adds the timed distortion notify.
- **`clear_fx()` now also removes tracks that hold only FX notify states**, so the spread copies go away too.
- `AM_TB_Dash` and `AM_TB_Dash_Evade` were rebuilt with no distortion notify on any track.

The `NS_DashTrail_Distortion` asset itself stays in the project for now; it may still be useful for melee work.

## Checking it

I dashed in every direction (forward, back, left, right, roll) from three camera angles (yaw/pitch 0/0, 120/-35 and 250/25), on both the host and the client. Every mid-dash frame showed the whole body, and `NS_DashTrail_Distortion` never spawned: 0 components, 0 log lines.

## What I took from it

**Test screen-space distortion near the player from more than the default camera.** Behind the player, from the side, across the camera ray. The default camera is exactly where I'd never notice it.

**A rebuild script that "clears" notifies has to find all of them.** That means both `notify` and `notify_state_class`, on every track. The montage editor moves overlapping notifies onto other tracks when it saves, and a script that only looks where it put them will miss those.

**The on/off paused-frame diff is the fastest tool I have for effects bugs.** It turned "something is wrong with the dash" into "this component does it" in one step.
