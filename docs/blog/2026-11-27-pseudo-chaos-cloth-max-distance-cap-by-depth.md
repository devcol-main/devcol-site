---
title: "Stopping a Chaos Cloth Coat From Folding Over in UE5: Capping Max Distance by Depth, Measuring the Hem Angle, and the Iteration Count That Undid It"
description: "How I bounded the swing of a Chaos cloth coat in UE5 after three rounds of config tuning failed: finding out the tuning had gone into the wrong skeletal mesh, capping the painted Max Distance in proportion to each vertex's depth below the pivot, a runtime hem-angle probe to measure it, and why a copied Iteration Count 4 / Subdivision Count 2 then folded the sim mesh into shards."
date: 2026-11-27
workedOn: 2026-11-01
publishAt: 2026-11-27
track: "Coat cloth"
category: "Build Logs"
sidebar: "Max Distance Cap by Depth"
image: /blog/pseudo-cloth-cap-c.jpg
outline: deep
tags: [UE5, Chaos Cloth, Animation, Python, Multiplayer]
---

# Stopping a Chaos Cloth Coat From Folding Over in UE5: Capping Max Distance by Depth, Measuring the Hem Angle, and the Iteration Count That Undid It

The player in PSEUDO wears a long coat simulated with Chaos cloth. Strafing left or right flung its hem up past horizontal, and the legs poked through it. If your cloth flaps too far, the short answer is this: damping, velocity scales and anim drive only make a large swing less likely. The painted **Max Distance** map is the one setting that puts a hard limit on it, and if you scale it by how far each vertex hangs below its pivot, the limit becomes an angle. This post covers that cap, the probe I used to measure the angle, the earlier mistake that had made every previous fix pointless, and a solver setting that broke the coat right after.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-cloth-cap-c.jpg" alt="A coat could swing 2 m off its pose until Max Distance was capped by depth." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-cloth-cap-c-dark.jpg" alt="A coat could swing 2 m off its pose until Max Distance was capped by depth." loading="lazy">
</figure>

## Three rounds of tuning on a mesh the player never used

Before this work there had already been three passes on the coat's cloth config: higher damping, lower velocity scales, an anim drive, thicker collision, self collision. None of them changed what I saw in play, and the reason was simple once I looked. They had all been made on a headless copy of the character mesh that is only used when the MetaHuman face swap is turned on. With the face swap off, which is the normal case, the player renders the original Paragon mesh from the marketplace pack, and its cloth config had never been touched:

| Setting | Mesh the player actually used | Mesh that had been tuned |
|---|---|---|
| Max Distance (bottom half of the coat) | **200 cm** | 200 cm |
| Linear / Angular Velocity Scale | 0.26 / 0.26 | 0.05 / 0.05 |
| Fictitious Angular Scale | 1.0 | 0.1 |
| Damping / Local Damping | 0.025 / 0 | 0.3 / 0.3 |
| Anim Drive Stiffness | 0 | 0.6 |
| Collision Thickness / CCD / Self collision | 0.5 / off / off | 2.5 / on / on |

The first row also explains why config alone could never solve it. On both meshes the painted Max Distance was 100 to 200 cm from mid-thigh down. Max Distance is how far a simulated vertex may move away from its skinned position, so the hem was allowed to go anywhere within two meters of where the animation put it. Nothing physical prevented a fold of more than 90 degrees.

The marketplace content folder is read-only in this project, so the first step was to give the player its own copy of the body mesh. The copy still references the pack's skeleton, materials, physics assets and cloth collision capsules (pelvis, spine, thighs, calves) without saving anything back into the pack. The character Blueprint's mesh component now points at the copy, and the face swap still switches to the headless mesh as before. The tuned config was copied over to the new mesh one property at a time.

If you have more than one skeletal mesh for the same character (a LOD variant, a face-swap version, a cinematic copy), check which one is rendering before you tune cloth. Select the mesh component in the running game and read its Skeletal Mesh field.

## Turning Max Distance into an angle

A vertex that hangs at depth `d` below a pivot and swings by angle `A` around it moves `2 × d × sin(A/2)`. Flip that around: if every vertex's Max Distance is at most `k × d`, it cannot swing more than about `2 × asin(k/2)` from its animated position. A ratio of 0.5 gives about 29 degrees and 0.77 gives about 45.

So I wrote a cap instead of a new paint pass. For each vertex of the cloth's sim mesh, on all five cloth LODs:

```cpp
const float Depth = FMath::Max(TopZ - MeshData.Vertices[Index].Z, 0.f);
Values[Index] = FMath::Min(Values[Index], FMath::Max(DepthRatio * Depth, MinDistance));
...
Asset->ApplyParameterMasks(true, true); // masks -> sim weight maps, tethers, render vertex contributions
```

`TopZ` is the top of the free region (the highest vertex that is not pinned), and pinned vertices stay pinned. The function only ever lowers values, never raises them, so to loosen the coat again you have to start from the original map or repaint it. `ApplyParameterMasks` matters: changing the mask alone does not update the simulation's weight maps, tethers or the render-vertex mapping.

Python cannot read a clothing asset's LOD data (`UClothingAssetCommon::LodData`), so the cap and two helpers live in a small C++ Blueprint function library in the game module: one dumps the cloth LODs and weight maps per height band as text, and one measures the hem angle at runtime. The module needed `ClothingSystemRuntimeCommon` and `ClothingSystemRuntimeInterface` as private dependencies.

The cap does a second job. Because the coat can no longer go far from its skinned pose, and the skinned coat follows the thigh and calf bones, it also stays out of the legs. I added no new collision capsules.

## Measuring how far the hem swings

"Flap less, never more than 45 degrees" is something you can measure, so I gave the test a number. The probe reads the simulated particle positions for the hem (the lowest 15 % of the free region, 30+ particles) and computes each one's angle from straight down, around a pivot at the top of the free region:

```cpp
// Sim data is stored in the cloth reference bone space (pelvis); Data.Transform = that bone's world transform.
const FTransform RefBoneRefPose = FAnimationRuntime::GetComponentSpaceTransformRefPose(RefSkeleton, Asset->ReferenceBoneIndex);
...
// Pivot = the hem particle's reference-pose point raised to the top of the free region, moved rigidly with the pelvis.
const FVector PivotRef(RefPosition.X, RefPosition.Y, TopZ);
const FVector PivotWorld = Data.Transform.TransformPosition(RefBoneRefPose.InverseTransformPosition(PivotRef));
const FVector ParticleWorld = Data.Transform.TransformPosition(FVector(Data.Positions[Index]));
// 0 = hanging straight down, 90 = folded up to pivot height
const float Angle = FMath::RadiansToDegrees(FMath::Acos(FVector::DotProduct((ParticleWorld - PivotWorld).GetSafeNormal(), FVector::DownVector)));
```

The detail that is easy to get wrong is the space. The sim positions are stored relative to the cloth's reference bone (here the pelvis), not in component space, so the pivot has to be moved with that bone.

A Python script drove the host on a listen server with one client, with enemies frozen: idle, strafe right, strafe left, a zig-zag every 0.5 s, a forward run, a run with two dashes, then a stop. For each phase it recorded the largest single particle angle and the largest hem average. I also ran a reference copy with Max Distance at 0.15 cm, which pins the coat to the animation, so I could see how much of the angle came from the animation alone.

| Phase | Before (max / mean, degrees) | After, ratio 0.5 | Pinned to the animation |
|---|---|---|---|
| Idle | 18-21 / 9-10 | 11-13 / 8-9 | 13 / 9 |
| Strafe right | 88-95 / 44-56 | 57 / 27-29 | 57 / 28 |
| Strafe left | **157-175 / 130-150** | 57-58 / 28-30 | 58 / 29 |
| Zig-zag | **163-177 / 142-162** | 57 / 28-31 | 58 / 31-33 |
| Run forward | 128-176 / 105-131 | 56-57 / 28-31 | 57 / 31-32 |
| Run + dash | 111-172 / 93-114 | 72-81 / 44-51 | 70-75 / 46-47 |

Anything above 90 means the hem was flung above its pivot. After the cap the coat stayed within about 6 degrees of the pinned version. The remaining 57-degree maximum while moving isn't cloth at all: it is one front-flap particle that is skinned to the thigh and follows the stride, and the pinned copy shows the same value. The dash peak comes from the lunge pose in the same way.

Cloth isn't replicated; every machine simulates every visible coat itself from the settings in the mesh asset. The client's copy of the host's pawn measured 57.3 / 27.5 while strafing right, against 56.9 / 26.9 on the host.

## The coat stopped flapping and tore into shards

The next playtest found a regression the probe could not see. The coat no longer flapped at all, and while moving it broke into dark, jagged shards around the legs.

One of the settings copied over from the tuned mesh was the solver step setting: **Iteration Count 4 / Subdivision Count 2**, where the Paragon original uses 2 / 1. With the coat held close to its animated pose by the cap, that sub-stepped solve folded the 219-vertex simulation mesh into itself whenever the legs changed direction. The detailed render coat is skinned to the sim mesh with offsets along its normals, so a folded sim triangle throws render vertices outward. Those were the shards.

I found it by changing one thing at a time in the same scene: a fixed side camera, a zig-zag strafe, and a screenshot at the moment of the direction change.

| Variant (everything else equal) | Coat at the turn |
|---|---|
| Coat as merged (cap 0.5, self collision on, Iter 4 / Subdiv 2) | shards, folded |
| Same, self collision off | still folded |
| Fresh copy of the Paragon mesh with the tuned config, Iter 2 / Subdiv 1, no cap or cap 0.77 | clean, flaps |
| Original map copied back, cap 0.77, self collision off, **Iter 4 / Subdiv 2** | folded |
| Same with **Iter 2 / Subdiv 1** | clean |

The fix was data only. I copied the Paragon Max Distance map back (one more helper in the library: same LOD and vertex count required, copies the sim map and the paint mask, then `ApplyParameterMasks`) and capped it again at **0.77** instead of 0.5, so the coat may swing about 45 degrees and moves again. The solver went back to Iteration 2 / Subdivision 1. Self collision went off: on this low-resolution sim mesh the flaps overlap, and self collision only made them fight. With that, the hem average stayed between 26 and 28 degrees while strafing and running.

The probe missed the shards because it measures the hem, and the fold was in the middle of the coat. Screenshots at the direction change are the check for that.

One more cause turned up after this, and it is in its own post: the anim drive that was also part of the copied config held the coat folded from the moment of a fresh spawn, which mesh-swap tests never reproduced. See [A Coat That Shattered Only After a Fresh Spawn](./2026-11-01-pseudo-coat-shards-anim-drive). For the separate case where the thigh showed in front of the coat even with the simulation off, see [The Coat Wasn't Clipping, the Idle Was](./2026-11-01-pseudo-coat-through-thigh-relaxed-idle).

## If your cloth swings too far

- **Find the mesh that renders.** Check the component in the running game before you tune anything, especially if you keep a second copy of the character for a face swap or cinematics.
- **Read the Max Distance map.** If the bottom of a skirt or coat has values of a meter or more, config tuning can only make big swings rarer. Lowering Max Distance makes them impossible.
- **Scale the cap by depth.** `MaxDistance <= k × depth below the top of the free region` turns "never more than A degrees" into `k = 2 × sin(A/2)`: 0.5 for about 29 degrees, 0.77 for about 45.
- **Measure an angle.** Compute particle angles around a pivot in the cloth reference bone's space, and compare against a pinned copy so you know what the animation contributes.
- **Change one solver setting at a time.** If cloth starts to tear into shards after a config copy, check Iteration and Subdivision Count and self collision first, and look at screenshots of direction changes as well as any numbers.
