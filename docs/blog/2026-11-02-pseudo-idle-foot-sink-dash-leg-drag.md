---
title: "Three Foot Bugs, Three Causes: A Sunken Idle Foot, a Dragging Dash Leg and a Foot That Hovered"
description: "In PSEUDO the idle left foot sat inside the floor, the dash dragged one leg far behind the body, and after a dash a foot hovered. They looked like one foot IK problem. They were a clip edited the day before, a bad dash pose frame, and Foot Placement still planting feet while a static pose slid the body."
date: 2026-11-02
publishAt: 2026-11-07
track: "Idle foot sink and dash leg drag"
outline: deep
tags: [UE5, Animation, IK, Debugging]
---

# Three Foot Bugs, Three Causes: A Sunken Idle Foot, a Dragging Dash Leg and a Foot That Hovered

My feedback list for the day had three lines about feet. Standing idle, the front of the left foot was inside the ground. During a dash, the right foot was far from the body and dragged along, and the return to running was rough. After a dash, a foot floated a little above the floor.

All three are feet and all three involve foot IK, so the obvious guess was one broken foot IK setup. It wasn't. There were three separate causes, and only one of them was really about IK.

## The symptom

The repro: `L_Test_Combat`, PIE as a listen server with one player, a flat floor, starting unarmed, then idle and a forward dash.

- **Idle**: the toes of the left foot under the floor.
- **During the dash**: the right leg stretched far behind the pelvis and dragged.
- **After the dash**: one foot hovering a few centimeters up.

I had written the hovering one down as the left foot. The measurement said it was the character's right foot, which is the foot on the left of the screen when you look at the character from the front. Small thing, but it's why I measure before I believe my own bug report.

### How I measured

Eyeballing feet against a floor is unreliable, and the floor in the animation editor's preview isn't the floor in the game. So I measured in PIE: every frame, the height of the `foot_*` and `ball_*` sockets minus a line trace to the floor under each bone. `ball_*` is the lowest foot bone this skeleton has; there's no toe-tip bone on `TwinBlast_Skeleton`. A negative number means the bone is below the floor.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | Foot IK fails on this floor | Unarmed idle for 3 s: `ball_l` -5.05 cm, `foot_l` -2.77 cm, steady; right foot about 0 | Ruled out. Foot Placement keeps the clip's own foot height, so the clip itself has the foot under the floor |
| 2 | The previous day's thigh rotation lowered the foot | The left foot is 14.5 cm in front of the hip; rotating the thigh back moves the foot down along an arc; the foot was also pitched 10° toes-down | **Confirmed** |
| 3 | The greatsword idle has the same problem | Sword idle: all four bones between -0.5 and -1.1 cm | Ruled out (minor) |
| 4 | The dash pose stretches the leg | `TB_Dash_Pose`: `foot_r` goes from 35 to 97-100 cm from the pelvis, pelvis height drops from 95 to 56 cm, blend-out 0.15 s | **Confirmed** |
| 5 | The hover after the dash is Foot Placement's plant lock | Unarmed, after the dash: `foot_r` +5.9 cm, 58 cm behind the pelvis (38 cm before the dash), steady; foot IK stays on during the dash | **Confirmed** |

## The causes

### 1. The idle clip, edited the day before

The day before, I fixed the long coat clipping through the left thigh in the relaxed idle by rotating the `thigh_l` track of `TB_Idle_Relaxed` back by 10° on every frame. The coat was fixed. But the left foot sits 14.5 cm in front of the hip in that pose, so swinging the thigh back moves the foot along an arc, and the arc goes down. The foot also ended up pitched 10° toes-down. Result: `ball_l` about 5 cm below the floor.

I had expected foot IK to clean that up. It doesn't, and by design: Foot Placement keeps the animated foot's height above the floor trace. If the clip says the foot is 5 cm below the floor, Foot Placement faithfully keeps it 5 cm below the floor.

### 2. The dash pose was a full sprint stride

The dash uses a static pose clip, `TB_Dash_Pose`, taken from a single sprint frame. That frame was mid-stride: the trailing foot nearly a meter behind the pelvis. Combined with a 0.15 s blend-out, it looked like a dragged leg followed by a snap back.

### 3. Foot Placement kept running through the dash

The anim blueprint `ABP_Pseudo_SC` enables Foot Placement whenever the character isn't falling. A dash isn't falling, so it stayed on. During the dash it pulled the pelvis down (its maximum pelvis offset is 50) and planted the trailing foot on a spot in the world. The body then slid away from that spot. After the dash, the plant lock still held a world position the leg could no longer reach, so the foot hung in the air.

## The fix

| Asset | Change |
|---|---|
| `TB_Idle_Relaxed` | Two-bone IK baked into `thigh_l` / `calf_l` / `foot_l` on all 482 frames: ankle up 3 cm, foot pitched flat. I rotated the knee pole so the knee only moves 2.5 cm further forward than after the coat fix (14.0 to 16.7 cm; plain IK gave 19), at the cost of about 6.5 cm outward. That keeps the coat fix intact. |
| `TB_Dash_Pose` | Re-baked from the greatsword `TB_Sprint_Fwd` at frame 22 (0.784 s), the frame where the feet are closest together (15.3 cm) and the torso still leans forward. Static clip, 0.482 s. New float curve `DisableFootIK` = 1. |
| `AM_TB_Dash` | Blend-out 0.15 → 0.3 s. |
| `ABP_Pseudo_SC` | Foot Placement alpha = `NOT bIsFalling AND GetCurveValue(DisableFootIK) < 0.5` (the 0.1 s blend is unchanged). |

The curve is the part I'll reuse. Any montage can now turn Foot Placement off by carrying `DisableFootIK` = 1 on its clip, and as the montage blends out, the curve fades and foot IK comes back with fresh plants at the new position.

## Checking it

PIE listen server, one player, enemies frozen, same probe:

| Check | Before | After |
|---|---|---|
| Unarmed idle `foot_l` / `ball_l` | -2.77 / -5.05 cm | 0.0 / 0.0 cm |
| Sword idle (worst bone) | -1.11 cm | -1.18 cm |
| Dash: largest foot distance from the pelvis | about 100 cm | 35-43 cm |
| Dash: pelvis drop | 38 cm | 4.6 cm (sword) / 8.9 cm (unarmed) |
| 1.5 s after a dash (unarmed) | `foot_r` +5.9 cm, 58 cm behind | -0.09 cm, 38.9 cm (36.9 before the dash) |
| Coat at spawn, same views as the coat fix | — | not pierced |

One leftover went on the polish list: during the unarmed dash's 0.3 s blend-out, `ball_l` dips to -4.75 cm for a moment. I haven't judged the new dash pose's feel in play yet either, only its numbers.

## What I took from it

**A bone fix in one place moves things somewhere else.** Rotating a thigh is never only a thigh change: the foot is at the end of that lever. After any bone rotation in a clip, I now re-measure foot heights in PIE, not just look at the thing I was fixing.

**Foot IK preserves the clip's mistakes.** I'd been treating Foot Placement as a safety net that keeps feet on the floor. It keeps feet at the height the animation asked for, relative to the floor. A clip with a foot under the ground stays under the ground.

**Static poses that move the body need foot IK off.** A pose clip that slides the character across the floor while Foot Placement plants the feet will stretch a leg, and the plant can outlive the pose. The `DisableFootIK` curve is now the rule for any such clip. The [Defense](/wiki/systems/defense) page has what the dash does in gameplay; this was purely about how it looks.

**Measure, don't eyeball.** A per-frame socket probe with a floor trace turned "a foot floats a bit" into "+5.9 cm, 58 cm behind the pelvis, and it's the right foot, not the left". That number pointed straight at the plant lock.
