---
title: "Knocked Back With Pistols Out: An Aiming Torso, Foot IK and a UE5 Hit Reaction Fix That Took Two Rounds"
description: "Knocked back with PSEUDO's dual pistols drawn, the player kicked a leg up to hip height while the torso stayed upright and aiming. The first fix handled the torso, an upper-body aim pose layered over the hit reaction. The leg was foot IK planting the feet while the knockback pushed the body 600 cm."
date: 2026-11-06
workedOn: 2026-11-04
publishAt: 2026-11-06
track: "Pistol knockback breaks the legs"
category: "Debugging / Animation & Cloth"
sidebar: "Pistol Knockback Breaks the Legs"
outline: deep
tags: [UE5, Animation, IK, Anim Blueprint, Debugging]
---

# Knocked Back With Pistols Out: An Aiming Torso, Foot IK and a UE5 Hit Reaction Fix That Took Two Rounds

When an enemy knocks the player back in PSEUDO, the whole body curls and gets pushed away (the reaction tiers are on the [Defense](/wiki/pseudo/systems/defense) page). With the greatsword drawn, that's what happens. With the dual pistols drawn, I got a screenshot of something else: pistols still aimed forward, and the left leg kicked up to hip height.

I fixed it, called it done, and it was still broken. This post covers both rounds, because the first round was a real fix for a real problem, just not the one in the screenshot.

## The symptom

- **Observed**: knockback with the pistols out, torso upright and aiming, one leg kicked out. Basic ammo was selected on the HUD.
- **Expected**: the whole body follows the knockback [montage](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-montage-in-unreal-engine) `AM_TB_Knockback`, curled and pushed back, the same as with the greatsword.
- **Repro**: `L_Test_Combat`, standalone PIE, `PseudoEquip Weapon.Ranged.DualPistols`, then `PseudoReact Knockback`, a side camera, and a pause 0.3 s into the reaction.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The knockback clip itself has the kicked leg | The same reaction with the greatsword drawn | Ruled out: the body curls normally |
| 2 | Something covers the upper body during the full-body montage | Pistols with Fire ammo: torso upright and aiming, legs from the clip | **Confirmed** |
| 3 | An upper-body fire montage covers it | Basic ammo, LMB, then knockback 0.15 s later | Ruled out after the fix: the body curls and the shot still fired (ammo 5/6) |
| 4 | The stance hold pose layer | `StanceHoldAlpha` stays at 1 under the knockback. Basic ammo has no hold pose | **Confirmed** for ammo types with a hold pose (torso only) |
| 5 | *Round 2, after "still broken":* foot IK plants the feet during the push | Basic ammo, moving, knockback, side camera: torso follows the clip now, one leg stretched forward | **Confirmed** |

## Round 1: the torso

Some pistol ammo types (Fire, Ice, Poison, Laser and the heavy machine gun) have a **stance hold pose**: an upper-body pose the character holds while that ammo is selected. The anim blueprint applies it as an upper-body layered blend that comes **after** the montage slot. That order is what lets you walk and run with the pose on top. It also means the hold pose overrides the spine and arms of any montage, including full-body ones: knockback, launch, down, stun, hit reactions and the dash.

The anim instance only eased the hold weight toward "is a hold pose selected". It never looked at whether a full-body montage was playing. So during a knockback, the reaction's legs played under an upright, aiming torso.

The fix is one more condition: while anything plays in the full-body `DefaultSlot`, the hold weight eases to 0.

```cpp
// UPseudoAnimInstance::NativeUpdateAnimation
static const FName FullBodySlot(TEXT("DefaultSlot"));
const bool bFullBodyMontage = GetSlotMontageGlobalWeight(FullBodySlot) > 0.f;
StanceHoldAlpha = FMath::FInterpConstantTo(StanceHoldAlpha,
	bStanceHoldOn && !bFullBodyMontage ? 1.f : 0.f,
	DeltaSeconds, 1.f / FMath::Max(StanceHoldBlendTime, 0.01f));
```

Montages replicate, so the owner, the server and every other client see the same montage and drop the hold the same way. No new replicated state. The ranged component already followed the same rule when blending into a stance: a full-body montage owns the body.

Round 1 checks: Fire and Ice ammo with a knockback, the torso followed the clip, and `StanceHoldAlpha` was back at 1.0 about two seconds later with the Ice hold pose still selected. Basic with a knockback, and Basic with a shot then a knockback, looked normal.

## Round 2: the leg

It was still broken. And in hindsight the screenshot had told me: it showed **Basic** ammo, and Basic has no hold pose. Round 1 could fix the torso for other ammo types, but it could never have explained that screenshot.

This time I tested while moving, from a side camera. The torso now followed the clip, and one leg was stretched forward: a foot planted on the floor while the body slid away from it.

The relevant part of the anim graph, in order:

```
Slot DefaultSlot -> CopyBone x2 -> FootPlacement -> LegIK -> stance blend -> UpperBody slot
```

Foot Placement's alpha is `!bIsFalling && GetCurveValue(DisableFootIK) < 0.5`. I added that curve check two days earlier, when the [dash dragged a leg](./2026-11-02-pseudo-idle-foot-sink-dash-leg-drag) for the same reason: Foot Placement kept planting feet while a montage moved the body. The dash clip got the curve. `TB_KnockBack` had no curves at all. So during a knockback that pushes the character 600 cm, the feet stayed planted and the leg stretched to reach them.

The fix was the dash rule, applied to one more clip: a float curve `DisableFootIK` = 1 over the whole of `TB_KnockBack` (0 to 1.5 s). The montage's blend-out fades the curve, so foot IK comes back as locomotion takes over. No code change.

## Checking it

- **Round 2**, Basic ammo, moving, knockback: 0.3 s in, both knees bent the way the clip has them and no stretched leg. At 0.55 s the character was back to walking normally.
- **Dash with the pistols**: with Basic ammo, normal. With a hold-pose ammo the dash also plays in `DefaultSlot`, so by the same rule it now shows the dash clip's upper body instead of the aim pose. That's intended, but I haven't checked it visually yet. If it looks wrong it goes on the polish list.

Then the follow-up: if knockback had this, other reactions that push the body would too. The clip used for the down push, lying on the floor and death (`TB_Death_Bwd`) and the launch take-off (`TB_KnockUp`) got the same curve. Checked while moving with Basic ammo: down push at 0.25 s, lying at 1.3 s, launch take-off at 0.12 s, all normal. Stun and the hit reaction keep foot IK on, since they don't push the body and planted feet are correct there.

## What I took from it

**A layer blended after the montage slot needs a rule for full-body montages.** Layering an upper-body pose on top of everything is what makes it work during locomotion. The same order makes it win over a hit reaction. New layers now get checked with a hit reaction, not only while walking.

**Anything that moves the body along the ground needs `DisableFootIK` on its clip.** Knockbacks, pushes, slides, dashes. I made that rule two days ago for the dash and didn't go looking for other clips it applied to. That search is what the follow-up was.

**Check reactions while moving, from the side, over several frames.** My round-1 check looked at one frame, standing still, and saw a normal pose. The planted foot only shows when the body is actually travelling, and only from an angle where you can see the leg stretch.

**Read the whole bug report.** The screenshot said Basic ammo. I fixed something that only happens with other ammo types and didn't stop to ask why the screenshot's case was covered.
