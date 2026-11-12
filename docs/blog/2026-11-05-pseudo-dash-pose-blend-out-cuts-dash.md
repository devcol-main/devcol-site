---
title: "Bringing Back the Dash Pose: A Longer Montage Blend-Out That Ended the UE5 Dash Ability Early"
description: "Putting PSEUDO's one-frame forward dash pose back looked like a one-field change. Measuring it first showed two bugs waiting in the old montage: a longer blend-out that ended the dash ability after 0.165 s, and Foot Placement coming back mid-blend and sinking the feet."
date: 2026-11-07
workedOn: 2026-11-05
publishAt: 2026-11-07
track: "Dash pose cuts the dash"
outline: deep
tags: [UE5, GAS, Animation, IK, Debugging]
---

# Bringing Back the Dash Pose: A Longer Montage Blend-Out That Ended the UE5 Dash Ability Early

PSEUDO's dash covers about 450 units in 0.35 s, with 350 ms of invulnerability (the [Defense](/wiki/systems/defense) page has the rules). For a while the forward dash played a static pose: a single frame taken from a sprint clip, `TB_Dash_Pose`, held while root motion moves the character. A few days ago I had three foot bugs around that dash, written up in [Three Foot Bugs, Three Causes](./2026-11-02-pseudo-idle-foot-sink-dash-leg-drag), and soon after the forward dash was switched to a borrowed evade clip instead.

I wanted the one-frame pose back for the forward dash, without bringing the old foot problems back with it. The old [montage](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-montage-in-unreal-engine), `AM_TB_Dash`, was still in the project with the same section layout, so the obvious change was to point the pawn's `DashMontage` at it again.

Nobody had reported anything wrong with that montage. I measured it before switching, and that's where both bugs turned up.

## The symptom

- **Repro**: `L_Test_Combat`, a listen server and one client, `DashMontage` set to `AM_TB_Dash` in memory (restored afterwards), forward dash.
- **Expected**: about 470 cm of travel, the same as the evade clip, and the full invulnerability window.
- **Observed**: the character moved 347 to 370 cm, and the dash ability ended 0.165 s after the press.

The feet had a smaller problem of their own: during the pose's blend-out, the worst foot bone went up to 5.2 cm below the floor.

### How I measured

The same probe as in the foot bugs post, every frame in both PIE worlds: the `foot_*` and `ball_*` socket heights minus a floor trace, foot-to-pelvis distance on the ground plane, pelvis height, the active montage, and the value of the `DisableFootIK` curve.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | Swapping `DashMontage` back to `AM_TB_Dash` is enough, since it has the same layout | Measured: the blend-out started 0.165 s after the press, the character moved 347-370 cm | Ruled out: it cuts the dash |
| 2 | The dash ability ends when the montage starts blending out | The dash ability binds the montage's `OnBlendOut` to `EndAbility`; the root motion task and the end of the dash state go with the ability | **Confirmed** |
| 3 | The foot dip comes from blending the two poses | With Foot Placement held off until late (curve value 10), the same blend stays above the floor: unarmed -0.11 cm | Ruled out |
| 4 | Foot Placement coming back in the middle of the blend causes the dip | Per frame: the lowest values come right after the curve drops below 0.5. Curve 1 → 3: unarmed -3.4 → -0.2 cm, sword -4.91 → -1.32 cm | **Confirmed** |

## Cause 1: the blend-out decides when the dash ends

A montage's automatic blend-out starts at the end of the section minus the blend-out time. The forward section of `AM_TB_Dash` is 0.482 s long, and its blend-out is 0.3 s, so the blend-out starts at 0.182 s (0.165 s measured from the first frame I saw it playing).

The dash ability ends on `OnBlendOut`. When the ability ends, the root motion stops and the invulnerability window closes. So a dash that should move for 0.35 s was ending about halfway through.

It wasn't always like that. When I first set up the dash, the section was 0.48 s with a 0.15 s blend-out, which put the blend-out start at 0.33 s, close to the 0.35 s move. Then in the foot bug fix I doubled the blend-out to 0.3 s, to smooth the return from the pose to idle. I tested the feet after that change, and only the feet. Doubling the blend-out also moved the moment `OnBlendOut` fires, and nothing in that test looked at distance or timing.

## Cause 2: Foot Placement comes back too early

The pose clip carries a `DisableFootIK` curve. The animation blueprint reads it and turns Foot Placement off while it is above 0.5. The curve value is scaled by the montage's weight, so with a value of 1, Foot Placement comes back on when the pose's weight drops to 0.5.

At half weight, the legs are still far from the idle pose. Foot Placement, partly applied, plants feet that aren't where it expects them, and its pelvis offset pushes them into the floor.

## The fix

Both fixes are asset changes. I left `AM_TB_Dash` alone and put the pose into the montage the dash uses now, `AM_TB_Dash_Evade`:

| Asset | Change |
|---|---|
| `AM_TB_Dash_Evade` | The `Fwd` section is `TB_Dash_Pose` for 0.7 s. The blend-out now starts at 0.40 s, after the 0.35 s move and invulnerability. The other sections (back, left, right) keep their evade clips and only shift in the montage; their effects were rebuilt by script. |
| `TB_Dash_Pose` | `DisableFootIK` 1 → 3, so Foot Placement comes back at pose weight 0.17 (0.5 / 3). |

**Why 0.7 s.** The blend-out starts at the section length minus 0.3 s, and that has to be after both the 0.35 s move and the 0.35 s of invulnerability. 0.7 s leaves a 0.05 s margin so a frame boundary can't clip either one. The pose shouldn't be held after the move, so the ability now ends at about 0.40 s, about 0.2 s sooner than with the evade clip.

**Why change the curve and not the threshold.** The 0.5 threshold in the animation blueprint is shared with the death, knockback and knock-up clips. The curve value only touches this pose. I swept it, worst foot bone during the blend-out:

| Curve value | Unarmed | Sword | Pelvis above idle during the blend-out |
|---|---|---|---|
| 1 (before) | -3.4 cm | -4.91 cm | 0.1-1.9 cm |
| 2 | -1.05 cm | -2.26 cm (over the 2 cm limit) | ~3 cm |
| **3 (chosen)** | -0.2 cm | -1.32 cm | ~3-4 cm |
| 4 | -0.11 cm | -1.23 cm | ~4.5 cm |
| 10 | -0.11 cm | -1.23 cm | ~5 cm |

Above 3 the feet gain nothing, and the body rises more: without Foot Placement, the idle clip's body stands about 5 cm higher.

## Checking it

Listen server and one client, both machines, unarmed and with the sword, standing and running into the dash:

| Check | Old `AM_TB_Dash` timing, curve 1 | After |
|---|---|---|
| Distance moved | 347-370 cm | 468-472 cm |
| Blend-out start after the press | 0.165 s | 0.38-0.40 s |
| Worst foot bone in the blend-out | -5.16 cm (sword) / -3.26 cm (unarmed) | -1.71 cm (sword, running) / -1.43 cm (unarmed, running); from a stand -1.46 / -0.11 cm |

The unarmed dip I'd left on the polish list in the foot bugs post (`ball_l` at -4.75 cm) is now -0.11 cm from a stand. The back, left and right sections measured the same as before the change, and their effects matched a snapshot taken before the rebuild.

## What I took from it

**A blend-out time is also a timing change.** If an ability ends on `OnBlendOut`, changing the blend-out moves the end of the ability. After touching it, measure distance and duration, not only the pose that made you touch it.

**The rule for this dash, written down:** section length ≥ dash duration + blend-out.

**A curve read through the montage weight can go above 1.** Scaling the value chooses when it crosses a threshold during the blend, without touching the code or graph that reads it, and without changing anything for other clips that share the threshold.
