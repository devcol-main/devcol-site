---
title: "Putting a MetaHuman Face on a Paragon Body, Part 4: Grooms That Scatter and Hair That Vanishes at Mid Range"
description: "After trimming the MetaHuman face mesh, every groom scattered around the head, and at a middle camera distance all hair vanished and came back further out. Groom bindings are built for one mesh's vertices, and the assembled grooms had a Cards LOD with no card data, set per group."
date: 2026-10-15
publishAt: 2026-10-26
track: "MetaHuman face, part 4"
outline: deep
tags: [UE5, MetaHuman, Groom, Debugging]
image: /blog/pseudo-mhface-13.png
---

# Putting a MetaHuman Face on a Paragon Body, Part 4: Grooms That Scatter and Hair That Vanishes at Mid Range

The MetaHuman's hair, eyebrows, eyelashes, beard, mustache and peach fuzz are six groom components, and in the pilot Blueprint they sit under the face mesh. With the face on Twinblast's head ([Part 2](./2026-10-14-pseudo-metahuman-paragon-2-face-attach)) and Twinblast's head removed ([Part 3](./2026-10-14-pseudo-metahuman-paragon-3-headless-mesh)), two problems showed up in the hair:

1. After I swapped the face mesh for a trimmed copy, the grooms scattered around the head.
2. Zooming the camera out, all the hair disappeared at a middle distance and came back further away.

They looked related. They weren't, and the second one had a second layer.

Series: [1. Setup](./2026-10-14-pseudo-metahuman-paragon-1-setup) · [2. Face attach](./2026-10-14-pseudo-metahuman-paragon-2-face-attach) · [3. Headless mesh](./2026-10-14-pseudo-metahuman-paragon-3-headless-mesh) · **4. Grooms** · [5. Cloth and hair](./2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair)

## Why the face mesh was trimmed

The MetaHuman face mesh includes the neck and upper shoulders so it can tuck under MetaHuman clothing. On Twinblast, that skin poked through the coat collar. I duplicated the face mesh as `SKM_MC_MetaHuman_FaceMesh_SC` and deleted everything below the collar, per LOD, with Paint PolyGroups and PolyGroup Edit → Delete Faces. 5.8.3's Mesh tab has no plane cut (it has Simplify, Remesh, Weld, Jacket and Project), so painting the region was the way to select it.

## Problem 1: scattered strands

With the trimmed face assigned, hair strands no longer followed the scalp. They hung around the head in the wrong places.

<figure>
  <img src="/blog/pseudo-mhface-12.png" alt="MetaHuman hair and beard strands scattered around the head after the face mesh was replaced by a trimmed copy" loading="lazy">
  <figcaption>Grooms after the face mesh swap: the strands aren't attached to the scalp any more.</figcaption>
</figure>

This one was quick. Each groom component has a **Groom Binding** asset, and a binding stores, for each face-mesh LOD, which skin triangle every hair root attaches to. It's built for one specific mesh. Trimming changes the vertex count and order, so the stored data points at the wrong triangles.

The fix, per groom asset: **Create Binding** with the trimmed mesh as the target and the original face mesh as the source, then assign it as the component's Binding Asset. The rule I took from it: any edit to the face mesh invalidates every groom binding on it.

## Problem 2: gone at mid range

With the bindings fixed, the hair looked right up close. Then I zoomed out slowly.

<figure>
  <img src="/blog/pseudo-mhface-13.png" alt="The character at a middle camera distance with no hair, eyebrows or beard visible" loading="lazy">
  <figcaption>Middle distance: hair, beard and eyebrows all missing. Close and far were fine.</figcaption>
</figure>

Close: visible. Middle: everything gone. Far: back again. Something was switching on distance, and the obvious candidate was the face mesh's LOD, since that's what the grooms are bound to.

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The binding doesn't match the trimmed mesh | The bindings referenced the original mesh | Confirmed (problem 1) |
| 2 | The face mesh's LOD causes it | Forced face LOD 1 to N at close range | Ruled out: the grooms stayed visible |
| 3 | The groom picks its own LOD by screen size | Groom editor viewport at LOD 0, 1, 2 | Confirmed: LOD2 draws nothing |
| 4 | LOD2's geometry type is the problem | Groom editor → LODs tab | Confirmed: LOD0–1 Strands, **LOD2 Cards**, LOD3+ Meshes |
| 5 | Setting LOD2 to Strands fixes it | Changed LOD2 in Group ID 0 | Partly: only the short hair came back |
| 6 | The groom has more than one group | Scrolled the LODs tab | Confirmed: the braids are a second group, still on Cards |

Row 2 is why this took a while. Forcing the face LOD didn't reproduce it, because grooms choose their LOD by their **own** screen size, independent of the mesh they're bound to.

The Groom editor's LODs tab showed the actual setup:

<figure>
  <img src="/blog/pseudo-mhface-14.png" alt="Groom editor LODs tab: LOD0 and LOD1 use Strands, LOD2 uses Cards, LOD3 and above use Meshes" loading="lazy">
  <figcaption>The MetaHuman groom's LODs: Strands, Strands, <strong>Cards</strong>, then Meshes.</figcaption>
</figure>

MetaHuman grooms go from strands to cards to meshes as they get smaller on screen. This Assemble had produced **no card geometry**, so LOD2 had nothing to draw. LOD3 and beyond use meshes, which is why the hair came back further out.

## The second layer: groups

I set LOD2 to Strands and checked again. The short scalp hair came back. The long braids didn't.

<figure>
  <img src="/blog/pseudo-mhface-15.png" alt="Groom at LOD2 after switching only Group ID 0 to Strands: short hair visible, braids still missing" loading="lazy">
  <figcaption>LOD2 set to Strands in group 0 only: the braids, in another group, are still on Cards.</figcaption>
</figure>

LOD settings in a groom are **per group**. The hair groom has several (`Group ID 0`, `Group ID 1`, …), and the braids live in a different one from the scalp hair. The LODs tab lists each group's LODs one after another, and the second group was below the fold. Scrolling down showed it still set to Cards.

The pilot workaround: for every groom asset, in **every group**, LOD2 → Geometry Type **Strands** → Save. LOD2 keeps its curve decimation of 0.35, so it looks a little thinner than LOD0 at that distance, which is expected.

## Why this is a workaround, not a fix

Two reasons:

- **It's edited inside `/Game/MetaHumans/`.** A re-Assemble regenerates those assets and throws the change away. The face isn't final yet, so there will be re-Assembles.
- **Strands at LOD2 cost more** than cards, and I haven't measured how much.

The real fix is on the final Assemble: choose card hair, then confirm the Groom editor's Cards tab actually has data before trusting the LOD table. I've also got an open check to confirm every groom component points at its rebuilt binding.

## Takeaways

- **Editing a skinned mesh invalidates every groom binding on it.** Rebuild bindings after any trim or re-Assemble.
- A groom picks its LOD by its own screen size. Forcing the parent mesh's LOD tests nothing.
- Check each groom LOD's **Geometry Type** before blaming bindings or mesh LODs, and scroll the whole LODs tab: settings are per group.
- Anything changed under the assembled MetaHuman folder is temporary until the final Assemble.

Next: [Part 5, the coat stops flapping and the braids won't calm down](./2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair).
