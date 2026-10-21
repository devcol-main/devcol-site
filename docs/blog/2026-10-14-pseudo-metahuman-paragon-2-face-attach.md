---
title: "Putting a MetaHuman Face on a Paragon Body, Part 2: Making the Face Follow a Head It Wasn't Built For"
description: "A MetaHuman face under a Paragon Twinblast body floated in place, then drifted off the head in aim and jog poses. The face Anim Blueprint copies the head pose by bone name and assumes a MetaHuman body, and Leader Pose can't hide different bind rotations. A socket attach with an inverse offset, and no parent-pose copy, fixed it."
date: 2026-10-14
publishAt: 2026-10-25
track: "MetaHuman face, part 2"
outline: deep
tags: [UE5, MetaHuman, Animation, Debugging]
image: /blog/pseudo-mhface-6.png
---

# Putting a MetaHuman Face on a Paragon Body, Part 2: Making the Face Follow a Head It Wasn't Built For

With the MetaHuman assembled ([Part 1](./2026-10-14-pseudo-metahuman-paragon-1-setup)), the next step was the one I thought would be easy: put the MetaHuman face mesh on the Twinblast body and make it move with the head. In the first try the face didn't move at all. In the next few it moved, but slid off the head as soon as the character aimed or ran.

The cause had two layers. The MetaHuman face's Anim Blueprint copies the head pose from its parent by bone name, and it assumes that parent is a MetaHuman body. Twinblast's skeleton has different bind rotations, so no fixed offset lines up across poses. The fix was to attach the face to Twinblast's `head` socket with an inverse offset, and stop the face Anim Blueprint from copying the parent pose.

Series: [1. Setup](./2026-10-14-pseudo-metahuman-paragon-1-setup) · **2. Face attach** · [3. Headless mesh](./2026-10-14-pseudo-metahuman-paragon-3-headless-mesh) · [4. Grooms](./2026-10-15-pseudo-metahuman-paragon-4-grooms) · [5. Cloth and hair](./2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair)

## The setup

I built a pilot Blueprint, `BP_Pilot_SCFace`, to test this outside the real character:

```
DefaultSceneRoot
└── Body   (Twinblast skeletal mesh)
    └── Face   (SKM_MC_MetaHuman_FaceMesh)
```

The body plays idle, aim and jog animation assets directly, so I could switch poses without any gameplay code in the way.

## Attempt 1: just parent it

I put the face under the body and gave it the MetaHuman face Anim Blueprint, `ABP_Face_C`, because that's what drives expressions and blinks.

<figure>
  <img src="/blog/pseudo-mhface-3.png" alt="The MetaHuman face mesh floating above the Twinblast body instead of sitting on its head" loading="lazy">
  <figcaption>Face as a child of the body with only the face Anim Blueprint: it stays where it was placed.</figcaption>
</figure>

The face stayed exactly where I'd placed it. Being a child component only moves it with the component's transform, not with a bone, so the head could do whatever it liked.

## Attempt 2: Leader Pose

Leader Pose makes a skeletal mesh copy the bone transforms of another one, which is how modular characters keep clothing on a body. I set the face's leader to the body. Now the face landed on the head, and with an offset I could make idle look right. Then aim and jog pushed the face off the head again. Every offset I tuned for one pose was wrong in the next.

That pattern, "it fits in one pose and only that pose", is the clue. A fixed offset can't fix a mismatch that changes with the pose. I opened Twinblast's skeleton and looked at the reference pose of the neck.

<figure>
  <img src="/blog/pseudo-mhface-4.png" alt="Twinblast skeleton in the Skeleton editor with neck_01 selected, its reference rotation showing about 26.85 degrees on Z" loading="lazy">
  <figcaption>Twinblast's <code>neck_01</code> has a reference rotation of about 26.85° on Z. A MetaHuman neck doesn't.</figcaption>
</figure>

Leader Pose copies transforms in component space by bone name. When the two skeletons have different bind rotations for the same bone names, the copied transform means something different on each mesh, and the error grows as the bones rotate away from the bind pose.

## How Epic wires it

Before inventing my own approach, I read the Construction Script of the assembled `BP_MC_MetaHuman`.

It applies Leader Pose to every child of the body **except the face**. Clothing follows the body by Leader Pose; the face doesn't. The face follows the body because `ABP_Face_C` copies the neck and head bones from its parent mesh by name, inside the Anim Blueprint. That works when the parent is a MetaHuman body with the same names and the same bind pose. With Twinblast as the parent, it doesn't.

## Attempt 3: socket attach

The face only needs to follow one thing: Twinblast's head. So I attached it to the `head` socket and lined up the face mesh's own `head` bone with Twinblast's:

1. Face → Details → Sockets → **Parent Socket = `head`**.
2. In the Construction Script, `Get Socket Transform` on the face for its own `head` bone in component space, `Invert Transform`, then `Set Relative Transform` on the face.

<figure>
  <img src="/blog/pseudo-mhface-5.png" alt="Blueprint Construction Script: Get Socket Transform on the face for head in component space, Invert Transform, then Set Relative Transform on the face" loading="lazy">
  <figcaption>The inverse socket offset: move the face so its own <code>head</code> bone sits exactly on the parent socket.</figcaption>
</figure>

In idle this was right on. In aim, it drifted badly again.

## The head moved twice

The drift only happened while `ABP_Face_C` was running. With the socket attach in place, Twinblast's head motion reached the face once through the socket, and then the face Anim Blueprint copied the parent's head pose and applied it again.

<figure>
  <img src="/blog/pseudo-mhface-6.png" alt="Aim pose with the MetaHuman face pushed off the Twinblast head because the head motion is applied twice" loading="lazy">
  <figcaption>Socket attach with the face Anim Blueprint still copying the parent pose: head motion applied twice.</figcaption>
</figure>

Setting **Disable Post Process Blueprint** on the face component improved the alignment noticeably. Clearing the face's Anim Class entirely confirmed it: with no parent-pose copy, the face stayed on the head in idle, aim and jog.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The face just needs to be a child of the body | Face under body with `ABP_Face_C` | Ruled out: it floats |
| 2 | Leader Pose makes it follow | Leader Pose = body | Partly: one pose fits, others don't |
| 3 | The two skeletons have different bind poses | Twinblast `neck_01` reference rotation ≈ 26.85° on Z | Confirmed |
| 4 | Reuse the assembled Blueprint's Construction Script | Read the script | Ruled out: it never applies Leader Pose to the face |
| 5 | Socket attach on `head` | Parent socket + inverse offset | Confirmed in idle |
| 6 | The face Anim Blueprint still moves the head | Aim drifts only while it runs | Confirmed: applied twice |
| 7 | Skin at the right shoulder is an alignment error | Compared with the face mesh shape | Ruled out: a different problem |

## The shoulder skin

One thing didn't go away: dark skin poking through at Twinblast's right shoulder.

<figure>
  <img src="/blog/pseudo-mhface-7.png" alt="Idle pose with the MetaHuman face aligned on the head, but skin from the face mesh poking out through the collar at the right shoulder" loading="lazy">
  <figcaption>Aligned in idle, with skin poking out at the shoulder. That's the face mesh itself, not alignment.</figcaption>
</figure>

It isn't alignment. The MetaHuman face mesh includes the neck and the top of the shoulders, so it can sit under MetaHuman clothing. Attached rigidly to the head, that skin pokes through Twinblast's narrower collar. The fix is to trim a copy of the face mesh below the collar, which comes back to bite in Part 4.

## One rejected shortcut

Before any of this, I tried hiding Twinblast's own head with `HideBoneByName(head)`. It zero-scales the bone, which collapses anything attached to it (including the face I was about to attach) and distorts the neck vertices that are partly weighted to the head. Removing the head as geometry was the right call, and that's [Part 3](./2026-10-14-pseudo-metahuman-paragon-3-headless-mesh).

## Where it ended up

The pilot works. The plan for the real character:

- Duplicate `ABP_Face_C` as a version for SC, remove its **Copy Pose From Mesh** node, and keep the expressions and blinks.
- Trim the face mesh copy below the collar once the face is final, and redo it after every re-Assemble.
- In C++, a replicated flag on the PlayerState chooses the MetaHuman face, and its OnRep attaches the face to `head` with the inverse socket transform, so every client sees the same thing.

## Takeaways

- A MetaHuman face on a non-MetaHuman body: **socket attach, not Leader Pose**, and never let the face Anim Blueprint copy the parent pose.
- When a mesh lines up in exactly one pose, suspect bind-pose differences before tuning offsets.
- Read how Epic wired the original Blueprint before reusing any of its logic. The answer to "why doesn't Leader Pose work on the face" was in a Construction Script that never used it.

Next: [Part 3, removing Twinblast's head without losing his shirt](./2026-10-14-pseudo-metahuman-paragon-3-headless-mesh).
