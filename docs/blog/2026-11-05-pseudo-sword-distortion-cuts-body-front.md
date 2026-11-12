---
title: "The Same Trap From the Front: A Niagara Refraction Trail That Erased the Attacker's Torso"
description: "Hours after removing PSEUDO's dash distortion for cutting the player in half, a new pair of sword distortion trails did the same thing, but only when the camera looked at the attacker from the front. Lowering the refraction strength helped; making the ribbon narrower is what kept the body whole."
date: 2026-11-10
workedOn: 2026-11-05
publishAt: 2026-11-10
track: "Sword distortion cuts the body"
category: "Debugging / VFX & Rendering"
sidebar: "Sword Distortion From the Front"
outline: deep
tags: [UE5, VFX, Niagara, Rendering, Debugging]
---

# The Same Trap From the Front: A Niagara Refraction Trail That Erased the Attacker's Torso

The greatsword's light attacks in PSEUDO got new distortion trails: a pair of systems from a VFX pack, `NS_SlashTrail_Distortion_Only` and `NS_SlashTrail_Distortion_Only_Loop`. Despite the names, both loop; the only real difference is how long each ribbon point lives, 0.5 s for the first and 0.15 s for the second. Played together from the blade tip, the short one gives a tight bend right behind the weapon and the long one leaves a wake that fades later.

Earlier the same day I had removed the dash's distortion trail because it cut the player's body in half at some camera angles. That's in [A Dash That Cut the Player in Half](./2026-11-05-pseudo-dash-distortion-cuts-body). I'd written down "test distortion from more than the default camera" as the lesson. So before calling the sword pair done, I froze an attack and turned the camera around.

## The symptom

- **Repro**: `L_Test_Combat`, light attack, then turn the camera to face the attacker, or watch another player swing toward you. The default camera behind the attacker doesn't show it.
- **Expected**: the whole body stays visible from every angle.
- **Observed**: with the pair at the pack's defaults (width 100, `mul_Refraction` 2), Light_2 frozen 0.3 s into its hit window with the camera at yaw 210, in front of the attacker: only the legs were left. A flat band of floor stood where the torso should have been.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The distortion pair causes it | Hid both components in the same frozen frame | **Confirmed** |
| 2 | It's only the refraction strength | `mul_Refraction` 1.3, then 0.5, at width 100 | Better, but a band across the waist stayed even at 0.5 |
| 3 | It's the ribbon width | Width 40 with `mul_Refraction` 1 | **Body whole**: only a thin strip bends what it crosses |
| 4 | The motion-blur trail on the heavy attacks has the same problem | Heavy_1 and Heavy_2 from the same camera | Ruled out: it averages nearby pixels, so nothing is replaced from far away |

Row 4 mattered for the comparison I was making. The heavy attacks use a different trail, a motion-blur style ribbon that averages scene color along the swing direction. It doesn't pull pixels from a distance, so it can smear the body but not erase it.

## The cause

The pack's master material, `M_SlashTrail_Master`, drives [refraction](https://dev.epicgames.com/documentation/unreal-engine/using-refraction-in-unreal-engine) as `1 + texture * mul_Refraction * dynamic parameter`, in IOR mode. The ribbon is a flat sheet, and every pixel it covers shows scene color taken from an offset position. That's the same mechanism as the dash.

What the sweep showed is that the two settings do different jobs. The **sheet's size** decides how much of the body can be replaced at all. The **strength** mostly decides how far away the replacement pixels come from. At width 100 the sheet was wide enough to cover the torso, so no strength value could save it. I'm describing what I observed in the sweep; I didn't go into the engine source for this one.

As with the dash, no setting removes the effect from every angle. It can only be made small enough not to matter.

## The fix

- On the greatsword combo [montage](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-montage-in-unreal-engine), the pair's notifies now use a trail width of **40** instead of 100.
- The material instance the pair uses, `MI_SlashTrail_Distort_1`, now has `mul_Refraction` **1** instead of 2. It's our own copy, and only the pair uses it.

Both values are constants in the script that rebuilds the pair, so a rebuild keeps them. The result looks different from the pack's sample, and that's intended.

## Checking it

With the saved assets, after an editor restart, at yaw 210: Light_1, Light_2, Heavy_1 and Heavy_2 all showed the whole body. The light distortion was still visible, and milder than the old sword distortion it replaced, measured on the same rig at the default camera: 15 302 changed pixels against 41 432.

I'm treating this as fixed for the angle I tested. A thin strip can still bend what's behind it; that's what a distortion trail does. What it no longer does is take the attacker's torso with it.

## What I took from it

**Check any screen-space distortion near a character from the front of the attacker.** I had written that lesson down for the dash a few hours earlier, and the same trap came back with new assets. The only reason it didn't ship was that I actually ran the check.

**Width and strength are different knobs.** If a distortion is erasing something, lowering the strength makes the replacement pixels come from closer, but the area that gets replaced stays the same. Shrink the area first.

**Freeze, turn the camera, diff on and off.** It found the problem in one step again, the same way it did for the dash.
