---
title: "A Raised Arm Tears the Coat, Aiming Up Fades the Body: Two UE5 Causes Behind One Clipping Report"
description: "While aiming a grenade in PSEUDO, the coat looked torn and the body see-through. Two unrelated causes: skin weights folding the shoulder of a skinned (not cloth) coat at a 125-degree arm raise, and a camera dither fade that started because the spring arm was pressed against the floor. How to tell them apart, and the pose edit that fixed the shoulder."
date: 2026-11-15
workedOn: 2026-11-14
publishAt: 2026-11-15
track: "Grenade aim coat shoulder"
category: "Debugging / Animation & Cloth"
sidebar: "Grenade Aim Coat Shoulder"
image: /blog/pseudo-coat-shoulder-c.jpg
outline: deep
tags: [UE5, Animation, Skinning, Camera, Python, Debugging]
---

# A Raised Arm Tears the Coat, Aiming Up Fades the Body: Two UE5 Causes Behind One Clipping Report

If a character's coat or sleeve "looks torn" in one pose, check two things before touching cloth settings: whether the broken part is skinned or simulated, and whether your camera's fade-near-character logic is kicking in. In my case the report was one sentence, "while aiming a grenade, the hand and side of the body show and the coat looks torn", and it turned out to be both at once. A raised-arm hold pose folded the skinned shoulder of the coat, and aiming upward pushed the camera close enough to the body to start a dither fade. The fixes were a pose edit (relax the clavicle, bring the upper arm down to horizontal) and a narrower fade band.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-coat-shoulder-c.jpg" alt="A raised grenade arm folded the skinned coat shoulder, and aiming up started a camera fade." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-coat-shoulder-c-dark.jpg" alt="A raised grenade arm folded the skinned coat shoulder, and aiming up started a camera fade." loading="lazy">
</figure>

## One report, two pictures

The player in PSEUDO wears the long coat from the Paragon Twinblast character. When the dual pistols switch to grenade ammo, the character holds a cocked throw: an animation layer (the stance hold) freezes one frame of the grenade enter clip, `TB_Ability_VortexGrenade_Start`, at 1.733 s, and the upper body stays there until the throw.

There was no screenshot with the report, so I reproduced it in a combat test map with a listen server and one client at High scalability, froze time once the grenade stance was up, and took shots from the player's own camera, the front, both sides and close to the shoulder. Two different things showed up:

1. **At level aim**, the back of the coat shoulder had a ragged dark band, there was a stretched dark area on the side, and a thin spike stuck out under the arm. This only happened in the grenade pose.
2. **When aiming up**, past about 45 degrees of pitch, the whole character started to dither away. That happened with every ammo type, not only grenades.

Both read as "torn, see-through coat". Since I never saw the original screenshot, I can't say which of the two the player saw, or whether it was both. So I fixed both.

## Is the broken part cloth or skin?

The coat on this mesh is a mix. The long panels and the hem are Chaos Cloth; the shoulders and sides are ordinary skinned geometry that follows the bones through skin weights. Cloth problems and skinning problems look alike in a screenshot and need completely different fixes, so this was the first split to make.

The quickest test is to turn the simulation off (`disable_cloth_simulation` on the mesh component) and look again. With cloth off, the shoulder band and the spike were still there, unchanged. They were skinned. As a side note, the thigh holster then pierced the coat panel, which showed that the simulation was what had been keeping the panel clear of the holster. That's the same one-check test I used on [an earlier coat bug](./2026-11-01-pseudo-coat-through-thigh-relaxed-idle), where it showed the opposite: the animation, not the cloth, was at fault.

I ruled out the boring options too. No mesh section was hidden during the stance; every sample had the same assets visible. The grenade montages play on the upper body slot, and the pelvis and legs matched the basic-ammo pose exactly; only the arms differed.

To prove it was the arm, I changed the hold time in memory instead of editing the clip. At t 0.0 the shoulder was clean. At t 0.147 it had a faint crease. At t 1.733, the frame the game actually holds, it had the ragged band. The damage followed the arm height. In that frame the right upper arm stands 125 degrees from hanging, with the elbow behind the shoulder. The skin weights on the coat shoulder can't follow that: triangles on the back of the shoulder fold over each other, and a thin one at the side sticks out.

## Why aiming up made the body fade

The second cause came from an older feature. When the camera gets close to the character, the character dithers out so it doesn't fill the screen. The fade was driven by one number, the distance from the camera to the capsule: it started at `FadeStartDistance` (110 cm) and was complete at `FadeFullDistance` (40 cm).

Aiming up swings the camera down and behind the character. Before the body ever blocks the view, the spring arm hits the floor and the camera gets pushed in toward the character. A sweep over pitch showed the distance falling steadily, and the same numbers for basic and grenade ammo:

| Pitch | 40 | 45 | 50 | 55 | 60 | 65 | 70 | 80 |
|---|---|---|---|---|---|---|---|---|
| Camera to actor (cm) | 188.4 | 157.2 | 135.8 | 120.3 | 108.7 | 99.8 | 93.0 | 83.4 |
| Fade before (110 / 40) | 0 | 0.003 | 0.324 | 0.708 | 0.939 | not run | 1.0 | 1.0 |
| Fade after (70 / 30) | 0 | 0 | 0 | 0.043 | 0.479 | 0.875 | 1.0 | 1.0 |

At pitch 0 the camera sat at 221.9 cm and the fade was 0.000, which is why nobody had noticed it. Grenades are simply the ammo players aim up with most.

<figure>
  <img src="/blog/pseudo-coatshoulder-03.jpg" alt="Own camera at pitch 60 before the change: the character is mostly dithered out" loading="lazy">
  <figcaption>Before: own camera at pitch 60. The camera is pushed against the floor and the character is almost faded out, although nothing is in the way yet.</figcaption>
</figure>

<figure>
  <img src="/blog/pseudo-coatshoulder-04.jpg" alt="Own camera at pitch 70 before the change: the character is gone" loading="lazy">
  <figcaption>Before: pitch 70. Only the throw arc is left on screen.</figcaption>
</figure>

I narrowed the band to 70 / 30 cm. That's the smallest change, and it keeps the original purpose working at walls. It helps, but from pitch 55 up the body still dithers (0.04, 0.48, 0.88, 1.0 at 55 to 70). It also changes the wall case. With the camera 30 cm from a wall behind the player, the fade is 1.0 before and after, but at a 100 cm gap it dropped from 0.929 to 0.614, so the body now hides a bit more of the view there. Both values are one line in a header, and I'll judge them in play.

## Lowering the arm without dropping the hand

For the shoulder I had a few options. Holding an earlier frame of the same clip (t 0.147) also cleans up the shoulder, but then the hand drops in front of the chest, and the enter animation would rise and then fall back. I wanted the hand to stay up, as a cocked throw.

So I edited the clip in place with a Python script that rewrites the right arm bones from 0.147 s on, ramping in fully by 0.30 s. Editing the existing clip, rather than adding a new hold clip, keeps the enter montage and the held pose reading the same data, so they stay consistent. The original is still in version control.

The first pass only moved the upper arm. It slerps `upperarm_r` 80 % of the way back toward its local rotation at 0.147 s, then recomputes `lowerarm_r` so the forearm keeps its direction in world space:

```python
new_u = unreal.MathLibrary.quat_slerp(u_q, ref_q, alpha * ramp)
# forearm keeps its rotation in space, so only the shoulder comes down
new_l = compose_transforms(lower_world, invert_transform(new_upper_world)).rotation
```

That lowered the hand from 85 to 75 cm in the clip and made the back band thinner and the spike much smaller. It didn't get rid of them. A crease stayed on the back of the shoulder, and on the right side a hard horizontal ridge with a dark fold remained under the arm.

## The clavicle was half the problem

Looking at the remaining crease, I found the clip was doing more than raising the arm. At the hold frame it also pulls the right clavicle about 25 degrees back and 30 degrees up from its bind pose, and the upper arm was still above horizontal (its height over the shoulder, `arm z`, was 0.28 after the first pass).

On this coat, the back between the shoulder blades is skinned to the clavicle, so a pulled-back clavicle bunches it into the crease. The underside of the sleeve is skinned to the upper arm and the side panel to the spine, so when the arm is above horizontal the sleeve rides up over the side panel and the panel folds into the ridge.

The script got two more parameters. The clavicle turns halfway back to its bind pose, the upper arm is recomputed under the new clavicle, and then it swings 15 degrees further down, with the forearm again keeping its direction:

```python
new_c = unreal.MathLibrary.quat_slerp(c_q, bind_c, clavicle_bind * ramp)
new_parent = unreal.MathLibrary.compose_transforms(_rot_only(new_c), spine)
new_u = unreal.MathLibrary.compose_transforms(new_upper_world, unreal.MathLibrary.invert_transform(new_parent)).rotation
```

I tried the neighbouring settings too:

| Variant | Result |
|---|---|
| Upper arm only, but further (alpha 1.0, arm z 0.18) | The side ridge stays: the arm is still above horizontal |
| Clavicle fully back to the bind pose | The shoulder sags and the top of the sleeve folds |
| Clavicle halfway + upper arm horizontal (arm z 0.02) | Back crease and side ridge gone; taken |

<figure>
  <img src="/blog/pseudo-coatshoulder-01.jpg" alt="Right side of the grenade hold before the clavicle change: a hard ridge with a dark fold under the arm" loading="lazy">
  <figcaption>Before the second pass: from the right side, look under the raised arm for the horizontal ridge and the dark fold where the sleeve rides over the side panel.</figcaption>
</figure>

<figure>
  <img src="/blog/pseudo-coatshoulder-02.jpg" alt="Right side of the grenade hold after the change: the sleeve hangs softly, no ridge" loading="lazy">
  <figcaption>After: clavicle halfway to bind, upper arm horizontal. The ridge is gone and the sleeve hangs softly; the hand is lower but still at head height.</figcaption>
</figure>

## Putting numbers on a clipping fix

"Looks better" is hard to compare between variants, so I wrote a small skinning probe in C++ (Python can't read skinned vertex positions). It CPU-skins the current pose with `ComputeSkinnedPositions` and `ComputeSkinnedTangentBasis`. For each body vertex near a bone, it finds the nearest coat triangle that vertex projects into (within 6 cm) and the signed distance along the coat's skinned normal. Vertices that are already outside in the bind pose are skipped (the lining faces the body, and the shirt shows in the open front), so only new poking counts. It also counts folded coat triangles: ones whose face normal points against their skinned vertex normals.

| Measure | First pass | Final |
|---|---|---|
| Shirt poking through the coat at the side, count / max depth | 23 / 5.8 cm | 14 / 2.4 cm |
| Folded coat triangles at the shoulder | 5 | 2 |
| Upper arm z / hand height over the pelvis | 0.28 / 75 cm | 0.02 / 65 cm |

The client's copy of the host read the same numbers. The probe is relative, though: the plain pistol idle reads 42 poking and 47 folded and looks fine. The counts are only good for comparing poses within one stance. In the shots, idle, run and throw showed no coat regression.

## Checking your own character

If a coat or sleeve breaks in one pose:

- **Split skin from cloth first.** Turn the cloth simulation off on the component and look again. If the damage stays, it's skinned, and no cloth setting will fix it.
- **Test the pose without editing the asset.** Change the frame you hold (or the animation time) in memory and watch whether the damage tracks one bone. If it tracks the arm height, the pose is past what the skin weights can handle.
- **Check the shoulder girdle, not only the arm.** On this mesh the skinned coat holds up with the arm up to about horizontal, and a raised hold also needs the clavicle near its bind pose. A borrowed clip can move the clavicle a lot without it being obvious.
- **Keep the hand where it was.** When you lower the upper arm, recompute the forearm's local rotation so it keeps its world direction. The pose still reads as the same action.
- **Look from your own camera at several pitches.** A distance-based fade near the character can start when the spring arm is pressed against the floor, long before anything blocks the view. Log camera distance against pitch and compare it with your fade start distance.

## What's still open

- The hand is 10 cm lower in the hold than before. If the throw should read higher, a 10-degree drop is the middle ground, but I haven't measured it.
- From the right side the forearm passes in front of the face. It's on the far side of the head, with no intersection.
- The probe counts more poking at the sleeve opening at the elbow (22 to 61), where the gauntlet's plates meet the sleeve end. It's hidden by the gauntlet in every shot, so I left it.
- Aiming at a high pitch wasn't re-checked after the second pass; the fade numbers above are from the first.
- Two things I saw and didn't change: from the front the left knee sits in front of the coat panel in a rounded cut-out, in every stance including stowed, and the round holes and ragged hem are part of the Paragon coat itself at every pose. A cloth hem-angle readout also returned -1 on the first grenade selection after each PIE start, for both players, with the coat looking intact; I don't have an explanation for that yet.
