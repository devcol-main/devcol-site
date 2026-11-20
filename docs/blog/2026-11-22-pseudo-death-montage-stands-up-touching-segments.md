---
title: "A Dead Player Stands Up When the UE5 Death Montage Ends: a Parked Section End and Two Touching Anim Segments"
description: "In a UE5 game, a player killed from the front fell down and then snapped back to standing the moment the death clip ended. The montage held its position at the section end, and with two anim segments touching at that time, FAnimTrack::GetSegmentIndexAtTime picked the next clip's standing frame 0. Fixed in the montage asset with a 10 ms held frame between the sections."
date: 2026-11-22
workedOn: 2026-11-20
publishAt: 2026-11-22
track: "Death clip stands up"
category: "Debugging / Animation & Cloth"
sidebar: "Death Montage Stands Up"
image: /blog/pseudo-death-hold-c.jpg
outline: deep
tags: [UE5, Animation, Montage, Debugging]
---

# A Dead Player Stands Up When the UE5 Death Montage Ends: a Parked Section End and Two Touching Anim Segments

If you play one section of a montage and expect it to hold its last frame, check what comes right after that section in the track. When a section with no next section finishes, the montage instance parks its position a hair before the section end, and if another clip's segment starts at exactly that time, the engine evaluates the later segment. In PSEUDO that meant frame 0 of the back-hit death clip, a standing pose, on every front-hit death. A held frame of 10 ms between the sections fixed it without any code.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-death-hold-c.jpg" alt="The parked section end landed on the next segment's frame 0, a standing pose." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-death-hold-c-dark.jpg" alt="The parked section end landed on the next segment's frame 0, a standing pose." loading="lazy">
</figure>

## How the death montage is laid out

The player's death in PSEUDO (UE 5.8.3) plays one montage, `AM_TB_Death`, with two sections: `Fwd` for a hit from the front and `Bwd` for a hit from behind. Each section is a different clip on the same slot track, placed one after the other. The montage has auto blend-out turned off, both in the asset and on the playing instance, so the body is meant to stay on the floor until the respawn or the retry screen. A section plays on its own and never runs into the next one.

The bug: after a front-hit death, the body fell, and the moment the clip ended it stood straight up and stayed standing until the respawn. It looked the same on the host and the client. A back-hit death was fine.

## The montage looked right; the pose didn't

The obvious suspect was a blend-out back to the standing locomotion pose. That was already ruled out by the asset and by the code, which sets `bEnableAutoBlendOut = false` on the instance.

The next suspect was something stopping the montage: the ability ending, the respawn logic, another montage. A per-frame log on both machines of the active montage, its section, its position and the pelvis height above the floor said no. `AM_TB_Death` stayed active, the section stayed `Fwd`, and the position stayed at 1.267 s.

The same log had the answer in the pelvis column. At position 1.223 the pelvis was 22 to 30 cm above the floor, lying down. At position 1.267, the section end, it was 100.5 cm. The montage state was correct, and the pose it produced at that position was a standing one.

## Why the next clip's frame 0 wins at the boundary

Exporting the montage track showed the layout:

| Segment | Clip | Start | End |
|---|---|---|---|
| 1 | `TB_Death_Bwd` (section `Fwd`) | 0 | 1.2667 |
| 2 | `TB_Death_Fwd` (section `Bwd`) | 1.2667 | ... |

The naming is confusing but correct for this project: a hit from the front plays the clip of falling backwards.

Two engine details meet at 1.2667:

1. When a section with no next section finishes, `FAnimMontageInstance::Advance` stops playing and keeps the position at the section end minus half of `KINDA_SMALL_NUMBER`.
2. When the slot evaluates the track at that position, `FAnimTrack::GetSegmentIndexAtTime` walks the segments in reverse order, so on a time shared by two segments the later one wins. The source comment there says the later segment wins on purpose.

The parked float position lands inside segment 2's range, segment 2 wins, and the pose is frame 0 of `TB_Death_Fwd`: standing. The back-hit section wasn't affected because it is the last one, and nothing follows it.

## Fixing it in the asset

I rebuilt `AM_TB_Death` with an editor Python script so the layout is reproducible:

- Segment 1: `TB_Death_Bwd`, 0 to 1.267 s.
- Then the last frame of that clip held for 0.01 s.
- Then `TB_Death_Fwd`.
- Section `Bwd` starts in the middle of the hold, at 1.2717 s.

Now no section boundary sits on a segment edge. A finished `Fwd` section parks inside the held frame, which is the fall's last pose. The back-hit section starts with 5 ms of the lying frame, while its blend-in weight is still about zero, so nothing visible changes there.

## What the test showed

PIE with a listen server and one client, killing each player with a console command, the retry delay raised to 8 s for the test so the hold could be measured:

| Kill | Clip ends after | Pelvis after the clip end (server copy / client copy) | Held for |
|---|---|---|---|
| Before, host | 1.27 s | 22-30 -> 100.5 cm (stood up) | - |
| After, host | 1.32 s | 23.8 / 23.8 cm, no change | 6.68 s, until the respawn |
| After, client | 1.29 s | 23.8 / 23.8 cm, no change | 6.70 s, until the respawn |

## Checking your own held montages

You probably have this bug if all of these are true: you play montage sections one at a time, you rely on the last frame holding (no auto blend-out, no next section), and the next section in the track uses a different clip that starts in a different pose. The section that is last on the track will look fine, which can hide the problem.

- Put a short held frame (a few milliseconds of the previous clip's last frame) between sections, and start the next section inside the hold.
- Or give each held section its own montage.
- When you debug a pose problem, log a bone height per frame next to the montage state. Here the montage, the section and the position all looked correct, and only the pelvis height showed the bug.

The same "hold the last frame" handover matters for ragdolls too; my post on [ragdolls launching at death](./2026-11-20-pseudo-ragdoll-launch-on-death) covers the auto blend-out side of it.
