---
title: "Putting a MetaHuman Face on a Paragon Body, Part 3: Removing a Head Without Losing the Shirt"
description: "Hiding Twinblast's head with M_Hide left the sunglasses floating, because they share the shirt's material slot. Deleting one empty slot then shifted every later index and moved the shirt into the hidden range. And the Skeletal Mesh Editor kept showing edits the asset didn't have. Three traps in UE 5.8's Skeletal Mesh Editing Tools."
date: 2026-10-14
publishAt: 2026-10-25
track: "MetaHuman face, part 3"
outline: deep
tags: [UE5, MetaHuman, Skeletal Mesh, Debugging]
image: /blog/pseudo-mhface-8.png
---

# Putting a MetaHuman Face on a Paragon Body, Part 3: Removing a Head Without Losing the Shirt

[Part 2](./2026-10-14-pseudo-metahuman-paragon-2-face-attach) got the MetaHuman face to follow Twinblast's head. Now Twinblast's own head had to go, along with his sunglasses and the cigarette. I ended up with a duplicate mesh, `TwinBlast_ActionHero_Headless`, edited with UE 5.8.3's Skeletal Mesh Editing Tools. Getting there involved three separate traps, and the second one nearly cost me the shirt without any visible warning.

Series: [1. Setup](./2026-10-14-pseudo-metahuman-paragon-1-setup) · [2. Face attach](./2026-10-14-pseudo-metahuman-paragon-2-face-attach) · **3. Headless mesh** · [4. Grooms](./2026-10-15-pseudo-metahuman-paragon-4-grooms) · [5. Cloth and hair](./2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair)

## Trap 1: M_Hide works per slot, and the sunglasses live in the shirt's slot

MetaHumans ship with a material called `M_Hide` that makes whatever uses it invisible. Twinblast's head is split across several material slots (skin, eyes, eyebrows, eyelashes, hair, mouth), so the obvious move was to assign `M_Hide` to elements 4 through 11.

The head vanished. The sunglasses and the cigarette didn't. I isolated each slot in the mesh editor and found them in **element 12, `Head_Shirt`**. Hiding that slot would hide the shirt too. `M_Hide` only works when a slot contains nothing but what should disappear.

So the sunglasses and cigarette had to be removed as geometry. That took some finding. The Skin tab of Editing Tools only has skin weight and polygroup tools; the delete is under **Model → PolyGroup Edit → Delete Faces**:

1. Skin → **Generate PolyGroups** → *From Material IDs*, so each slot becomes a selectable group.
2. Model → **PolyGroup Edit** → select the head groups → **Delete Faces** → **Apply to Asset**.
3. Generate PolyGroups again with *From Connected Tris*, so the sunglasses and the cigarette become their own islands → select → Delete Faces → Apply.
4. Repeat for every **Editing LOD**. Each LOD is a separate mesh, and an edit only applies to the LOD selected in the editor. This mesh had LOD0 to LOD4.

<figure>
  <img src="/blog/pseudo-mhface-9.png" alt="Skeletal Mesh Editing Tools with PolyGroup Edit active and Twinblast's head polygroup selected for deletion" loading="lazy">
  <figcaption>PolyGroup Edit with the head group selected, before Delete Faces.</figcaption>
</figure>

## Trap 2: deleting an empty slot renumbers everything after it

After deleting the faces, the material slots were still listed, and most of their delete icons were disabled. Editing Tools remove triangles, not slots. A slot can only be deleted once no section in any LOD uses it.

The Mouth slot did become deletable, so I deleted it, to tidy up. Then I looked at the list again.

<figure>
  <img src="/blog/pseudo-mhface-8.png" alt="Material slot list after deleting the Mouth slot: element 11 is now Head_Shirt instead of Mouth" loading="lazy">
  <figcaption>After deleting Mouth, element 11 is <code>Head_Shirt</code>. The Blueprint was hiding 4 to 11.</figcaption>
</figure>

Element 11 was now `Head_Shirt`. Every slot after Mouth had moved down by one. The pilot Blueprint's material overrides were assigning `M_Hide` to elements 4 to 11 **by index**, so the shirt had just moved into the hidden range. Nothing errors when that happens; the shirt just disappears the next time the Blueprint loads.

I put the Mouth slot back, restored all 15 slots to their original indices, and assigned `M_Hide` to the head slots on the asset itself:

| Element | Slot | Material |
|---|---|---|
| 0 | M99_SIM | none (kept) |
| 1–3 | LowerBody, Arms, Pistol | kept |
| 4–11 | TearLine, Eyes, eyebrow, Eyelash, EyeShadow, Hair, Head_Skin, Mouth/Teeth | `M_Hide` |
| 12 | Head_Shirt (sunglasses and cigarette deleted as geometry) | kept |
| 13–14 | Coat | kept |

One more detail: I used the project's copy of `M_Hide` under `/Game/MetaHumans/Common/Materials/`, not the one inside the MetaHuman Character plugin. The plugin copy would tie a game mesh to an editor plugin.

I also made a mistake in my own notes here: the first slot list I wrote from memory was off by one. Slot lists get written from the current asset, every time.

## Trap 3: the editor showed edits the asset didn't have

Later, the mesh editor showed Twinblast with no head, no sunglasses and no cigarette. In the pilot Blueprint, with the MetaHuman face hidden, the sunglasses were floating above the collar.

<figure>
  <img src="/blog/pseudo-mhface-10.png" alt="The headless Twinblast mesh placed in a level, with the sunglasses still visible above the collar" loading="lazy">
  <figcaption>The same mesh dropped into a level: sunglasses still there, although the mesh editor showed them gone.</figcaption>
</figure>

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | It's only a selection outline | Deselected; hid the face | Ruled out: really rendered |
| 2 | A lower LOD still has them | Forced LOD 1 to 5 on the body | Inconclusive: identical in every value |
| 3 | The Blueprint preview is stale | Placed the mesh in a level | Ruled out: the level shows them too |
| 4 | There are two headless assets | Checked the asset path | Ruled out: same asset |
| 5 | The mesh editor shows a different state than the asset | Turned **Editing Tools off** | **Confirmed** |

With Editing Tools on, the Skeletal Mesh Editor viewport shows the tool's working mesh. That didn't match the asset the Blueprint and the level were rendering. Turning Editing Tools off brought the editor in line with the asset, and after a save the sunglasses were gone everywhere. I didn't trace exactly when Editing Tools writes back to the asset; I just stopped trusting the viewport while it's on.

### Why the LOD test told me nothing

Row 2 was a wasted test, and the reason is worth knowing. The mesh's LOD settings now reported **one** LOD.

<figure>
  <img src="/blog/pseudo-mhface-11.png" alt="Skeletal mesh LOD Settings panel showing Number of LODs set to 1" loading="lazy">
  <figcaption>LOD Settings: <code>Number of LODs = 1</code>, although Editing LOD had listed LOD0 to LOD4 during editing.</figcaption>
</figure>

`Forced Lod Model` is the LOD index plus one (0 means automatic), and a value past the last LOD clamps to it. With one LOD, every value from 1 to 5 showed LOD0. The test couldn't distinguish anything.

I didn't find out why the LOD count dropped. The fix was: Editing Tools **off**, set `Number of LODs = 5`, Enter, **Regenerate**, Save. LOD1 to LOD4 are now reduced from the clean headless LOD0, so nothing comes back at a distance. Regenerate silently does nothing while Editing Tools is on.

## The collar

Looking through the empty neck hole from the front, the back of the collar looked see-through. Wireframe showed no hole; it's backface culling, and the MetaHuman neck covers it in practice. If it ever shows from the gameplay camera, a two-sided material instance on the headless mesh only will fix it.

## Takeaways

- **Never delete material slots** on a mesh that Blueprints or code refer to by index. Swap the material instead.
- Before relying on `M_Hide`, isolate the slot and check it holds only what should disappear.
- After Editing Tools work: **turn Editing Tools off, save, then test** with the mesh placed in a level. The level is the ground truth, not the asset editor.
- Read `Number of LODs` before a forced-LOD test.

The headless mesh now looked right. It wasn't done: the edits and the LOD regenerate had quietly broken the coat's cloth simulation, which only shows in motion. That's [Part 5](./2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair). First, the hair: [Part 4](./2026-10-15-pseudo-metahuman-paragon-4-grooms).
