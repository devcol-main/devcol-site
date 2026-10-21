---
title: "Putting a MetaHuman Face on a Paragon Body, Part 5: The Coat Stops Flapping and the Braids Won't Calm Down"
description: "With the MetaHuman face swapped in at runtime, Twinblast's coat stopped simulating and the legs clipped through it: mesh edits had dropped the section-to-clothing binding on every LOD. Separately, the braids whipped around at High scalability but looked right at Epic. Two motion-only bugs, and the checks that find them fast."
date: 2026-10-15
publishAt: 2026-10-26
track: "MetaHuman face, part 5"
outline: deep
tags: [UE5, MetaHuman, Chaos Cloth, Groom, Debugging]
image: /blog/pseudo-mhface-17.png
---

# Putting a MetaHuman Face on a Paragon Body, Part 5: The Coat Stops Flapping and the Braids Won't Calm Down

By the end of [Part 4](./2026-10-15-pseudo-metahuman-paragon-4-grooms), the MetaHuman face sat on the headless Twinblast body and looked right in a still frame. This last part is about the two problems that only showed once the character moved: the coat stopped simulating, and the hair simulated far too much.

In the game, a console command swaps between the two looks at runtime: `PseudoUseMCFace 1` switches SC to the headless body with the MetaHuman face, `PseudoUseMCFace 0` switches back to the original Twinblast mesh. That switch turned out to be the best debugging tool in this whole series.

Series: [1. Setup](./2026-10-14-pseudo-metahuman-paragon-1-setup) · [2. Face attach](./2026-10-14-pseudo-metahuman-paragon-2-face-attach) · [3. Headless mesh](./2026-10-14-pseudo-metahuman-paragon-3-headless-mesh) · [4. Grooms](./2026-10-15-pseudo-metahuman-paragon-4-grooms) · **5. Cloth and hair**

## Bug 1: the coat went stiff

With `PseudoUseMCFace 1`, Twinblast's long coat stopped flapping. It followed the legs like ordinary skinned geometry, and when he ran the legs pushed straight through it. Switching back with `PseudoUseMCFace 0` fixed it instantly.

My first suspect was the runtime swap itself. Changing a skeletal mesh asset at runtime with `SetSkeletalMeshAsset` is the kind of thing that could leave cloth in a bad state. But the original mesh simulated fine after swapping back and forth, so the swap wasn't breaking cloth in general. The problem was something about the headless asset.

### The one-line check

The Skeletal Mesh Editor's viewport stats have an `Active Cloths` line when cloth is running. On the original Twinblast mesh:

<figure>
  <img src="/blog/pseudo-mhface-16.png" alt="Original Twinblast mesh in the Skeletal Mesh Editor with viewport stats showing Active Cloths 1 and 193 dynamic particles" loading="lazy">
  <figcaption>The original mesh: <code>Active Cloths: 1</code>, 193 dynamic particles.</figcaption>
</figure>

On the headless mesh, the line wasn't there at all, even though the Clothing panel still listed the clothing asset with the same LOD data.

<figure>
  <img src="/blog/pseudo-mhface-17.png" alt="Headless Twinblast mesh in the Skeletal Mesh Editor: the clothing asset is listed in Asset Details but no Active Cloths line appears in the viewport stats" loading="lazy">
  <figcaption>The headless mesh: the clothing asset is there, but nothing is simulating.</figcaption>
</figure>

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The runtime mesh swap breaks cloth | Only the headless mesh is affected; the original works after swapping back | Ruled out as the main cause |
| 2 | The clothing asset is missing on the headless mesh | Asset Details → Clothing | Ruled out: present, same LOD0–4 data |
| 3 | Cloth isn't running on the headless mesh | Viewport stats | **Confirmed**: no `Active Cloths` line |
| 4 | The coat section lost its link to the clothing asset | LOD n → Sections → coat section → Clothing | **Confirmed**: `None` |
| 5 | The physics assets differ (cloth uses them for leg collision) | Physics Asset on both meshes | Ruled out: the same |

### Cloth needs two things

A skeletal mesh only simulates cloth when it has both:

1. The **clothing asset** on the mesh, holding the simulation mesh and its settings.
2. A **section bound** to that clothing asset, per LOD. The binding maps the section's render vertices to the simulation mesh.

In Part 3 I deleted faces with Editing Tools and regenerated the LODs. That rebuilt the sections, and the section-to-clothing binding was dropped on every LOD. The clothing asset stayed, which is exactly why this was easy to miss: the panel that says "clothing" looked fine.

The fix, with Editing Tools **off**: Asset Details → **LOD 0 → Sections** → the coat section (`M13_cloth2`, material `M_TwinBlast_ActionMovie_Coat`) → **Clothing = `TwinBlast_ActionHero_Clothing_0 - LOD0`**. Then the same for LOD1 through LOD4 with their matching clothing LODs, and save.

<figure>
  <img src="/blog/pseudo-mhface-18.png" alt="Headless mesh at LOD4 with the coat section's Clothing dropdown set to the clothing asset's LOD4 and the viewport showing Active Cloths 1" loading="lazy">
  <figcaption>Coat section re-bound on LOD4; <code>Active Cloths: 1</code> is back.</figcaption>
</figure>

I found the section by its **material and slot name**, not its index, because removing the head sections had renumbered the section list. Same lesson as the material slots in Part 3, from the other direction.

After that the headless mesh showed `Active Cloths: 1` with 26 kinematic and 193 dynamic particles, and in PIE the coat flapped and the legs stayed behind it.

### Deferred: a shoulder line at low LODs

At the lowest LODs a faint shoulder line still shows through the coat. The original Twinblast LOD4 is a hand-made imported LOD with 5,312 triangles. My regenerated headless LOD4 is auto-reduced to 1,986, and at that density the body and shirt vertices poke through the coat. The fix is a higher triangle percentage per LOD on the final Assemble, followed by re-binding the clothing again, because a regenerate drops it.

## Bug 2: the braids whip around

The MetaHuman's long braided hair swung far too much whenever SC ran, jumped or turned. Turning the simulation off calmed it down, but the hair then looked frozen to the head.

<figure>
  <img src="/blog/pseudo-mhface-19.png" alt="Groom editor LODs tab with a per-LOD Simulation setting offering Auto, Disable and Enable" loading="lazy">
  <figcaption>The per-LOD Simulation switch in the Groom editor's LODs tab: the fastest A/B test for "is it the simulation?"</figcaption>
</figure>

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The strand simulation is the source | LODs tab → Strands LODs → Simulation = Disable, every group | Confirmed, but the hair looked static |
| 2 | Compare with the assembled MetaHuman Blueprint | It has no input, only in-place animation | Skipped: not a fair comparison |
| 3 | The physics values need tuning | Physics tab: bend and stretch stiffness, damping, air drag | Partly helped |
| 4 | Engine scalability changes the result | Viewport Engine Scalability: High vs Epic | **Confirmed** |

Row 4 changed the question. At **Epic** scalability, the default groom physics looked natural. At **High**, the same settings swung much harder. My editor viewport had been at High while I tuned, and nothing on screen says so. I didn't trace which scalability setting causes it.

That matters beyond this bug. The editor viewport's scalability is a local editor setting. In the shipped game, the player's graphics options decide it, so every level has to be checked.

What I did:

1. Put the Strands LODs back to Simulation **Auto**, so simulation stays on.
2. Kept the default physics, which is correct at Epic, and adjusted some values so High is acceptable. I didn't record the exact numbers at the time, which is a gap in my notes I need to close before the final Assemble overwrites them.
3. Planned to turn hair simulation **off at Low and Medium**, through the graphics options. It's on the packaging checklist along with a recheck at High.

## What the series comes down to

Seven debugging notes, two days, one face. Looking back across all five parts, nearly every problem was the same problem: **something referred to something else in a way that silently broke when the referenced thing changed.**

- Material overrides by slot index (Part 3).
- Groom bindings to one mesh's vertices (Part 4).
- Cloth bindings to sections rebuilt by an edit (this part).
- A face Anim Blueprint that assumed its parent's skeleton (Part 2).

And most of the time was spent because a viewport told me something the asset didn't: an Editing Tools preview, a forced LOD that clamped, a groom that ignores the mesh's LOD, a scalability level I wasn't watching. The checklist I keep now:

- After any mesh edit or LOD regenerate: re-check groom bindings, the coat section's clothing on every LOD, and material slot indices.
- Test in a level with Editing Tools off, and look at `Active Cloths` when anything has cloth.
- Note the scalability level before tuning anything visual.
- Everything under the assembled MetaHuman folder is temporary until the final Assemble, so every fix there goes on a list to re-apply.

Back to the start: [Part 1, four setup blockers before Assemble](./2026-10-14-pseudo-metahuman-paragon-1-setup).
