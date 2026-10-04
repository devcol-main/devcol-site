---
title: "Swapping in a New Character: Root Motion, Jump Clips, and a Blank BlendSpace"
description: "Replacing the mannequin with a customizable character in UE5 and fixing what the animation pack broke: root-motion running, jump clips with baked-in height, a Python-built BlendSpace that played nothing, and a backward-run loop that stuttered."
date: 2026-10-02
outline: deep
---

# Swapping in a New Character: Root Motion, Jump Clips, and a Blank BlendSpace

Today I replaced Tumble Teams' default mannequin with a customizable low-poly character pack and rebuilt the animation setup around it. The most useful habit of the day was measuring bone data over time instead of guessing, because almost every problem turned out to be baked into the animation clips.

## No retargeting needed

I expected an IK-retarget job. It wasn't: every body part and all 18 animations in the pack already share one skeleton. So the task was simply to build a new Animation Blueprint for that skeleton, and the old mannequin AnimBP stayed untouched.

The setup: a new AnimBP parented to my C++ anim instance base class (with a new `Direction` variable), a locomotion BlendSpace, and a Jump / FallLoop / Land state machine. The state machine came over from the mannequin AnimBP.

## Issue 1: the run animation was a mannequin asset

Moving didn't play the run pose. Compiling passed with no warnings, but the copied state machine's BlendSpace node still referenced the mannequin BlendSpace, an asset for a different skeleton. I found it by extracting every `/Game/...` path string from the AnimBP file: exactly one mannequin path was left. After copying a graph, search for every asset reference. A successful compile doesn't prove they're all the right ones.

## Issue 2: the "lunge forward and teleport back" run

While running, the body lurched forward and snapped back each loop. The eight walk, run, and strafe clips were authored with **root motion**: the `root` bone travels as the clip plays. My character's position comes from `CharacterMovement`, so the animation's own root travel showed up on screen.

Sampling `root` over time in the forward run clip showed it moving 0 to 188 cm over 0.77 seconds, then snapping back to 0 on loop. The pack has a separate `root` bone apart from the hips, so locking just the root removes the travel while keeping the bob. I set `enable_root_motion = False` and `force_root_lock = True` on all eight clips.

## Issue 3: jumps with the height baked into the root

Jump start rose, the fall loop sat at zero, and landing started from 115 cm and dropped. Root height by clip:

| Clip | Root Z (cm) |
|---|---|
| Jump_Start | 0 to 110 |
| Jump_Loop | 115 (constant) |
| Falling_Idle | 0 |
| Jump_End | 115 to 3.7 |

Going from Jump_Start into the fall loop jumped 110 cm in one frame.

My first fix, the same root lock that worked for running, made things worse: on landing the character sank into the floor. These clips store jump height in the root and keep the hips *relative to the root*. Removing the root exposed the hips at negative heights in component space (about -19 cm mid-landing, versus 77 cm standing). Root locking is only safe when the root and its children are independent, as in a run cycle.

The fix was rewriting the bone tracks. World hips height is `root Z + hips height`; I clamped anything above the standing height (77.3 cm) and kept the crouches, with the root at zero. Original keys weren't readable through the API, so I sampled each frame with `get_bone_pose_for_time`, converted, and wrote the keys back through the animation data controller. The result: Jump_Start goes 72, 35 (crouch), 77; Jump_Loop stays at 77; Jump_End goes 77, 39, 72. The pack's originals are in git, so this is reversible.

## Issues 4 to 7: tuning the state machine

- **Jump_Start never played.** All six transitions had priority 1, so evaluation order depended on connection order. Giving the Jump transition priority 1 and the rest 2 fixed it.
- **Jump_Start felt slow.** The first half is a wind-up crouch, but the character leaves the ground on input. Start position 0.3 and play rate 1.6 cut the wind-up.
- **The landing-to-locomotion switch snapped.** Crossfade went from 0.2 to 0.35 seconds.
- **Feet looked off the ground on landing.** I suspected missing IK, but measurement said otherwise: the clip's final pose is within 0.5 cm of the floor. The first 0.25 seconds of Jump_End are "feet still in the air", which looked wrong after I'd clamped the body to standing height. Starting Jump_End at 0.25 s fixed it. This skeleton has no IK bones, and flat-ground landing doesn't need them.

## Issue 8: a BlendSpace built from Python that played nothing

For eight-direction movement I built a 2D BlendSpace (speed on X, direction on Y) from Python. The character didn't animate at all. An A/B test recording foot-bone height while moving showed the old 1D BlendSpace moving the feet and the new 2D one frozen at a single value, with all variables correct, which pointed at the asset.

Restarting the editor didn't help. The engine source did: the triangulation data a BlendSpace actually evaluates comes from `ResampleData()`, and that's called when the BlendSpace *editor* opens or edits the asset, not on load. Setting `sample_data` from Python saves fine but leaves the runtime data empty, so the asset falls back to the reference pose. (The 1D one worked because I'd opened it in the editor.)

The fix is opening the asset's editor once from script before saving. A follow-up bite: if the save is skipped because the asset isn't marked dirty, the data never reaches disk, so call `modify()` first and force the save. The file size grew from 13 KB to 31 KB, which is how I confirmed it landed.

More generally: if an asset built in code looks right but does nothing, find out who creates its derived data.

## Issue 9: stutter only when running backward

Backward running hitched periodically. My first theory, Direction wrapping around +179 to -179, didn't hold: the asset has zero interpolation time, so crossing the boundary doesn't produce a big blend swing.

Measuring the **loop seam** of every movement clip did. For each clip I compared the last pose to the first, over the hips, leg and foot chain in component space, relative to the average frame-to-frame change:

| Clip | Seam (cm) | Ratio to avg frame change |
|---|---|---|
| Run_Backward | 37.1 | 3.84 |
| Walk_Backward | 47.6 | 7.06 |
| other six | 0 to 9.6 | 0 to 0.85 |

Both backward clips have hips drifting in one direction through the loop (26 to 34 cm) instead of oscillating, then teleporting back at the wrap. Subtracting a linear drift from the hips track brought the seams down to 1.7 and 1.5 cm, and playing backward in PIE was smooth.

## Notes for next time

Measuring bone data over time found things like "root moves 188 cm" and "hips at -19 cm" within minutes, which looking at the animation never would have. A fix that works for one kind of clip, like root lock for running, can break another, like jumping. When a stutter repeats in one direction only, I'll look at the clip's loop before the input code. Python tick callbacks here fire about every 0.12 seconds, so they can't catch frame-level glitches, but loop-seam numbers from the asset data can. The edits to the animation pack are safe because the originals are in git.
