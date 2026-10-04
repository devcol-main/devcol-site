---
title: "Why Mixamo Animations Broke on My Character, and the Retargeting Pipeline That Fixed It"
description: "Importing Mixamo FBX files straight onto another skeleton in Unreal Engine 5 gives broken poses, even though bone names match. Why it happens, why you can't undo it, and the IK Retargeter pipeline with numeric verification."
date: 2026-10-03
outline: deep
---

# Why Mixamo Animations Broke on My Character, and the Retargeting Pipeline That Fixed It

I made the same mistake twice. I downloaded Mixamo animations and imported them directly onto my character's skeleton. The import succeeded without errors and the poses were wrecked: bodies bent, lying down, flying off in odd directions. The fix is to import onto Mixamo's own skeleton and retarget with the IK Retargeter, and to keep the Mixamo source assets around.

## Why it breaks

Bone track names (`root`, `Hips`, `head`...) match my character's skeleton, so the import raises no errors. But the values in the file are expressed in **Mixamo's local bone axes**, which differ from my character's. Unreal sees matching names and assigns the values without converting anything.

Hips at frame 0, in local space:

| | Normal animation on my character | Mixamo clip imported directly |
|---|---|---|
| Position | (0, -77, 0) | (-2, -14, 89) |
| Roll | about -30 degrees | about +103 degrees |

On my character the hips' local Y axis is up-and-down; in Mixamo's rig it's Z. Another tell: the imported clip had only 41 bone tracks, while Mixamo's rig has 65. Finger bones my skeleton doesn't have were dropped.

**The damage can't be undone.** The stored values are "Mixamo local" values, and with no Mixamo reference pose in the asset there's no way to convert them back. The only fix is importing again.

My second mistake: after converting the first clip, the Mixamo skeleton and mesh assets disappeared from the project, so the retargeter's source mesh was `None`. They aren't leftovers. **They're the source the retargeter needs**, so keep them after conversion.

## The pipeline that works

```
Mixamo FBX (With Skin, once)     -> own skeleton + mesh  (/Game/External/Mixamo/)
Mixamo FBX (Without Skin, rest)  -> import onto that skeleton
        |
IK Rig (source: Mixamo mesh)  +  IK Rig (target: my character mesh)
        |
IK Retargeter -> export / batch retarget -> animation for my skeleton
        |
(if needed) move travel from Hips to root -> montage -> ability
```

Import rules: never choose my character's skeleton at import; the first file gets skin, the rest don't (I let two files each create a skeleton, which was fine since the rigs match); don't delete the Mixamo skeleton and mesh; and for locomotion loops enable Mixamo's "In Place" option, while attack animations whose travel matters stay off and get the root-motion treatment below.

Both rigs use the same chain names, so after generating the retarget definition, `auto_map_chains(EXACT)` mapped all 21 chains automatically.

## Verify with numbers, not your eyes

I compared component-space bone positions, built by composing each bone's local transform up its parent chain:

| Frame 0 | Hips | Head | Foot height |
|---|---|---|---|
| Normal idle on my character | 77 | 149 | 9 |
| DropKick0 after retarget | 66 | 128 | 10 |
| ZombieKicking after retarget | 68 | 129 | 11 |

Head above hips above feet, with feet near 10, matches the earlier correct conversion, and the hips' local values returned to my character's convention. Whether limbs twist or feet slide still needs a human watching in preview.

## Mixamo puts forward motion in the Hips

Mixamo stores forward travel on the **Hips**, not the `root`. Played as-is, the mesh flies ahead and then returns to the capsule. To convert it to root motion for an attack with real travel:

1. Per frame, travel = the Hips' component-space Y minus its frame-0 value.
2. Write the root track as `(0, travel, 0)` and subtract the same amount from Hips local Z. This depends on how my skeleton's axes map, with the mesh rotated -90 degrees so component +Y is forward.
3. Write both tracks with the animation data controller and enable root motion.

The result matched the expected travel (329.76 cm). `DropKick0` moves only about 57 cm and `ZombieKicking` is in place, so I left them alone.

## A hand-through-the-floor fix

After landing in `DropKick0`, frames 93 to 141 have the character prone with hands below the floor (lowest hand points at -13.8 and -16.0 cm). I post-processed the keys with two-bone IK from Python: compute how much each hand needs to rise (at least to 1 cm), smooth that by expanding to the local max across plus or minus 2 frames and then averaging, solve arm and forearm with the law of cosines keeping the current elbow direction, and recompute the hand's local rotation to preserve its component rotation. Afterward the lowest hand and finger point stayed at 1.0 cm or higher, and the boundary frames stayed continuous. Toe base and handprop bones still dip slightly (-2.1 and -1.8) but they're display-only, so I left them.

## Notes on the Python API

- Batch retarget takes `AssetData` as its first argument, not an `AnimSequence` (`EditorAssetLibrary.find_asset_data`), and prints deprecation warnings but works.
- `BoneChain.start_bone` has to be read with `get_editor_property`.
- On the current animation data model, `get_raw_track_position_data` returns an empty array. Read poses with `AnimationLibrary.get_bone_pose_for_frame/time`.
- Writing keys goes through `controller.open_bracket`, `set_bone_track_keys`, `close_bracket`.
- Don't delete assets or close editors from Python; it crashed the editor. Delete in the editor or clean up with git.

## Checklist for the next Mixamo animation

- [ ] FBX: With Skin the first time, Without Skin after. In Place for locomotion loops.
- [ ] Import with the **Mixamo skeleton**, never the character's.
- [ ] Mixamo skeleton and mesh still in the project.
- [ ] The source IK Rig's mesh isn't empty.
- [ ] After retarget: Hips local values follow my character's convention, and head is above hips above feet.
- [ ] Forward-moving attacks: move travel from Hips to root and enable root motion.
- [ ] Montage in the default slot, then check in PIE.

One loose end: one montage came out 166 frames long while the retargeted clip is 202. Nothing in my scripts shortened it, so I suspect it was trimmed in the editor; if that wasn't intended, retarget again and rebuild the montage.
