---
title: "Putting a MetaHuman Face on a Paragon Body, Part 1: Four Setup Blockers Before Assemble"
description: "Before a MetaHuman face could go anywhere near a Paragon body, UE 5.8's MetaHuman Creator stopped me four times: missing GPU skinning settings, a deprecated runtime plugin, a greyed-out Assemble button and an asset-validator error. None were bugs, and each one has a one-line fix."
date: 2026-10-14
publishAt: 2026-10-24
track: "MetaHuman face, part 1"
outline: deep
tags: [UE5, MetaHuman, Debugging]
image: /blog/pseudo-mhface-2.png
---

# Putting a MetaHuman Face on a Paragon Body, Part 1: Four Setup Blockers Before Assemble

PSEUDO's characters use Paragon bodies and animations from Fab. One of them, which I call SC in the project, uses the Twinblast body. I wanted SC to wear a face I made in MetaHuman Creator instead of Twinblast's own head. That sounds like a component swap. It took two days and seven debugging notes, so I'm writing it up as a five-part series.

Series: **1. Setup** · [2. Face attach](./2026-10-14-pseudo-metahuman-paragon-2-face-attach) · [3. Headless mesh](./2026-10-14-pseudo-metahuman-paragon-3-headless-mesh) · [4. Grooms](./2026-10-15-pseudo-metahuman-paragon-4-grooms) · [5. Cloth and hair](./2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair)

This first part is the shortest. Before I could attach anything, I had to get a MetaHuman created and assembled inside the PSEUDO project, and UE 5.8.3 stopped me four times in a row. None of them were bugs in my code, and every one was fixed by a setting or an editor action. I'm writing them down because each error message points slightly away from the real fix.

## The goal

Create a MetaHuman Character asset in MetaHuman Creator (still Beta in 5.8), then use the Assembly tab to turn it into a regular Blueprint with body, face, clothing and groom assets under `/Game/MetaHumans/`. That assembled face mesh and its grooms are what the rest of this series attaches to Twinblast.

## Blocker 1: "Missing Project Settings!"

The first time I opened a MetaHuman asset, a dialog listed two renderer settings that weren't enabled.

<figure>
  <img src="/blog/pseudo-mhface-1.png" alt="Unreal Editor dialog titled Missing Project Settings, listing r.GPUSkin.Support16BitBoneIndex and r.GPUSkin.UnlimitedBoneInfluences for SKM_Face" loading="lazy">
  <figcaption>The first dialog: the MetaHuman face mesh needs two GPU skinning settings the project didn't have.</figcaption>
</figure>

This one is honest. A MetaHuman face has far more bones than a typical game character, and more bones influencing each vertex than the default GPU skinning path supports. The dialog names the mesh (`SKM_Face`) and both settings, and its **Enable Missing** button writes them into `Config/DefaultEngine.ini`:

```ini
[/Script/Engine.RendererSettings]
r.GPUSkin.Support16BitBoneIndex=True
r.GPUSkin.UnlimitedBoneInfluences=True
```

They apply to the whole project, not just the MetaHuman assets, which is worth knowing if the MetaHuman experiment is ever dropped.

## Blocker 2: a deprecated plugin that looks required

The plugin list has a `MetaHumanRuntime` entry marked Experimental. With MetaHuman assets failing to open, enabling anything with "MetaHuman" in the name felt like the obvious next step.

It isn't. The plugin's own description says it's deprecated and redirected to MetaHuman SDK. The plugins that matter are the MetaHuman Character ones, which I'd already enabled. I removed `MetaHumanRuntime` from `PSEUDO.uproject` and left it off. Enabling a deprecated plugin to fix an unrelated error is how a project ends up depending on something that disappears in the next engine version.

## Blocker 3: Assemble is greyed out

In the Assembly tab, the **Assemble** button was disabled, with a warning that the character is not rigged.

<figure>
  <img src="/blog/pseudo-mhface-2.png" alt="MetaHuman Creator Assembly panel with the Assemble button greyed out and a warning that the character is not rigged" loading="lazy">
  <figcaption>Assemble disabled. The viewport status also showed "Rig State: Unrigged".</figcaption>
</figure>

My first guess was another missing setting, since that's what the first blocker had been. The viewport status line settled it: `Rig State: Unrigged`. A character made in Creator starts as a shape without a rig, and Assembly needs the rig to build the face's skeletal mesh and its controls.

The fix is a toolbar button in the MetaHuman Character editor, **Create Full Rig**, then Assemble. I used the UE Optimized pipeline at High quality, kept Epic's default root directory `/Game/MetaHumans`, and named the result `MC_MetaHuman`.

## Blocker 4: a validator error right after Assemble

Assemble ran, and the Message Log immediately reported an asset validator error: a control rig in `/Game/MetaHumans/Common/Face/` soft-references an **unsaved package**, `SKM_Face`.

It reads like a broken asset. It isn't. Assemble had just created `SKM_Face`, and the validator ran before it was saved. **File → Save All** made the error go away for good. The two words worth reading in that message are "unsaved package": that's a save-order issue, not a reference problem.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The face mesh needs more bones and influences than the default GPU skinning allows | The dialog names `SKM_Face` and both settings | Confirmed |
| 2 | `MetaHumanRuntime` is required | Its description: deprecated, redirected to MetaHuman SDK | Ruled out, left disabled |
| 3 | Assemble is disabled because of another missing setting | Viewport status: `Rig State: Unrigged` | Ruled out; the character just had no rig |
| 4 | The validator error means a broken asset | It only appears right after Assemble, before saving | Ruled out; unsaved package at validation time |

## The checklist I use now

1. Enable the two GPU skinning settings before opening MetaHuman assets.
2. Leave `MetaHumanRuntime` off.
3. **Create Full Rig** before the first Assemble.
4. Save All right after Assemble, then read the Message Log.
5. Keep `/Game/MetaHumans` as the assembly root, and keep the Creator source asset in its own editor-only folder so it never ends up in a cooked build.

The result was `/Game/MetaHumans/MC_MetaHuman/BP_MC_MetaHuman`, with `Body`, `Clothing`, `Face` and `Grooms` folders next to it. That Blueprint is Epic's reference for how a MetaHuman is wired together, and reading it turned out to be the most useful step in the next part.

## Takeaway

Three of these four messages pointed at a plausible wrong fix: enable a plugin, hunt for another setting, repair a reference. The status line and the exact wording ("Unrigged", "unsaved package") were more reliable than the headline. Next time an editor workflow stalls, I'll read the quiet status text before the loud dialog.

Next: [Part 2, making the face follow a head it wasn't built for](./2026-10-14-pseudo-metahuman-paragon-2-face-attach).
