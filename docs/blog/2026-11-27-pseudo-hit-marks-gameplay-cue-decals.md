---
title: "Sword Slash Marks and Bullet Decals in UE5: Passing the Look Through the Gameplay Effect Context and Projecting Decals on the Visible Mesh"
description: "How I made sword hits leave a short glowing line on the enemy and bullets leave per-ammo decals in a UE5 GAS multiplayer game: the weapon or ammo as the effect context's source object, a world subsystem that spawns and fades cosmetic marks on every machine, one mark per machine from predicted and replicated cues, and why a mark placed at the hit point floated in the air or vanished inside the body until it became a decal attached to the hit bone."
date: 2026-11-27
workedOn: 2026-11-01
publishAt: 2026-11-27
track: "Combat feel"
category: "Build Logs"
sidebar: "Hit Marks and Decals"
image: /blog/pseudo-hit-marks-c.jpg
outline: deep
tags: [UE5, GAS, Gameplay Cues, Decals, VFX, Multiplayer]
---

# Sword Slash Marks and Bullet Decals in UE5: Passing the Look Through the Gameplay Effect Context and Projecting Decals on the Visible Mesh

I wanted hits in PSEUDO to leave a trace for a moment: a glowing line on the enemy where the sword passed, and a mark where a bullet landed, in the style of the ammo type that fired it. Two things from building it are useful in any Gameplay Ability System project. The weapon or ammo that decides how a mark looks can ride along as the **source object of the gameplay effect context**, which already replicates with the hit cue, so no new cue tags or RPCs are needed. And a hit result's impact point is on the **physics asset body**, not on the mesh you see, so anything placed exactly at that point floats on some characters and disappears inside others. A deferred decal attached to the hit bone projects onto whatever surface is actually drawn.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-hit-marks-c.jpg" alt="The impact point lies on the physics body, so slash marks became projected decals." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-hit-marks-c-dark.jpg" alt="The impact point lies on the physics body, so slash marks became projected decals." loading="lazy">
</figure>

The hit pipeline this hooks into is described in [Melee Hit Detection in UE5 With GAS Target Data](./2026-11-14-pseudo-melee-hit-detection-build), and the pistols and ammo types in [Server-Validated Hitscan in UE5 GAS](./2026-11-19-pseudo-hitscan-pistols-server-validated).

## Getting the weapon or ammo to every machine with the hit

Every hit already plays a hit cue on every machine. The attacker's machine plays a predicted copy right away, and the server's cue reaches everyone else; an existing rule skips the server's copy on the attacker's machine. So the cue was the right place to spawn a mark. What was missing was the information about which weapon or ammo made the hit.

I added an optional `MarkSource` to the melee hit parameters. On the server, the hit function adds it to the damage effect's context as its source object:

```cpp
// ApplyMeleeHit: the cue reads the look from the context's source object
Spec.Data->GetContext().AddHitResult(Hit, true);
if (Params.MarkSource)
{
	Spec.Data->GetContext().AddSourceObject(Params.MarkSource);
}
```

The predicted cue function got the same optional argument. The melee combo passes the equipped weapon definition for blade sweeps and nothing for area attacks. Ranged fire passes the ammo type. Enemies, the pet drone and area attacks pass nothing, and nothing means no mark. One replicated pointer carries both the per-ammo look and, later, a per-weapon slash look. Nothing else read the source object before, so nothing else changed.

The cue then hands the hit to a new world subsystem unless the hit was blocked by a shield:

```cpp
if (Hit && !bShielded)
{
	if (UPseudoHitMarkSubsystem* HitMarks = UPseudoHitMarkSubsystem::Get(MyTarget))
	{
		HitMarks->AddHitMark(MyTarget, *Hit, Parameters.EffectContext.GetSourceObject());
	}
}
```

The first test round found the reason for an "always set it" rule. Drone hits left slash marks, because when the hit code did not set a source object, the context kept the one from the ability spec. Now the hit function always sets the source, and only two types (an ammo type or a weapon definition) produce a mark. The same round found that the shooter saw one mark per shotgun pellet; now only the first pellet that hits a target passes the ammo along, which matches the server's one hit per target.

## A subsystem that owns cosmetic marks

`UPseudoHitMarkSubsystem` is a tickable world subsystem. It spawns, fades and removes every mark, and none of it replicates: each machine makes its own from its own cue.

- **Lifetime 1.5 s, on real time.** The game has a slow-motion mode, and marks should look the same during it. The last 0.75 s fade through a `Fade` material parameter (or a float parameter of the same name on an effect).
- **Caps.** 6 marks per target and 32 world decals; the oldest is removed first. A 3-second burst of fire logged `(1..5 on target)` and then 28 × `(6 on target)`, never 7, on both machines.
- **Everything is data.** On/off, lifetime, fade, caps, materials, sizes and parameter names are project settings. Each ammo type got a Hit Marks category: an enemy mark effect, a decal material, sizes, lifetime and color.

No real art was made for this. Niagara graphs cannot be built from Python, so the defaults are placeholders (a glowing line and a soft glowing disc with a dark core), and every one can be swapped for a Niagara or Cascade effect or another material without code.

For walls and floors, the shot cue already knew where a shot ended. A short local trace at that end point checks for WorldStatic geometry and leaves a decal there if it finds any. No extra data is replicated. Decals only go on world geometry; on characters, a decal in world space slides over the skinned mesh as it animates.

The same pass gave each ammo type its own muzzle and trail effect fields, tinted with the ammo color. Niagara effects take a `Color` user parameter. The Paragon Cascade effects have no instance parameter for color, so for those the cue makes a tinted dynamic copy of each emitter material that has one of a configured list of color parameters, cached per material and color.

## Why the first slash line floated on one enemy and was invisible on the others

The first version of the slash was a thin glowing rod, centred on the impact point and laid along the swing. For the direction I used the blade point's sweep during that frame, flattened onto the surface:

```cpp
// swing direction = this blade point's sweep, laid flat on the surface
FVector Direction = FVector::VectorPlaneProject(Hit.TraceEnd - Hit.TraceStart, Normal).GetSafeNormal();
```

The rod was attached to the hit bone so it moved with the body. A test moved the dummy 150 units, and the mark moved with it on both machines.

In play it looked wrong. On the mannequin training dummy the line hung in the air beside the body, and on the Paragon minions and the big Rampage enemy there was no line at all. The log showed marks being spawned on every enemy, so the problem was where they were placed.

A sweep hits the **physics asset** bodies, so `ImpactPoint` is on the surface of a capsule or box, not on the rendered mesh. The mannequin dummy's bodies are bigger than its mesh, so the rod sat outside it. The Paragon characters' bodies sit inside their meshes, so the rod was hidden inside the character.

The fix was to make the slash a **deferred decal**, attached to the hit bone and projected onto whatever visible surface is inside its box:

```cpp
UDecalComponent* Decal = NewObject<UDecalComponent>(Target, MakeUniqueObjectName(Target, UDecalComponent::StaticClass(), TEXT("HitMark_Slash")));
Decal->SetDecalMaterial(DecalMaterial);
// Decal box: X projects into the surface, Z = the swing (V of the decal UV), Y = the line's width
Decal->DecalSize = FVector(Depth, Settings->SlashMarkThickness * 0.5f, Length * 0.5f);
Decal->SetWorldLocationAndRotation(FVector(Hit.ImpactPoint), FRotationMatrix::MakeFromXZ(-SafeNormal, Direction).Rotator());
Decal->RegisterComponent();
Decal->AttachToComponent(AttachTo, FAttachmentTransformRules::KeepWorldTransform, Bone);
```

The box depth decides how far from the impact point the decal can reach a surface. A fixed half depth of 12 cm worked on the dummy and the minions, but on Rampage the mark was logged and still not visible. The depth now starts at 12 cm and grows with the hit body, up to 48 cm, using the smallest half extent of that body's bounds. The line's length is also clamped to the body's size along the swing.

This is the same "decals slide on skinned meshes" problem from above, and it is acceptable here: the decal is attached to a bone, so it follows that part of the body, and it only lives 1.5 s.

With the decal, the lines showed on the minions' forearm armour and across a helmet, on Rampage, and on the dummy's chest with nothing floating.

The same feedback asked to remove the glowing dot that bullets left on enemies. An ammo type with no enemy mark effect now leaves nothing on enemies. The fields, and the wall and floor decals, stayed.

## Checking it on a listen server

With one client on the combat test map:

- Sword hits from the host and from the client logged a `hit mark slash` line on both machines, the client first from its predicted cue, then the server.
- All six ammo types left a wall or floor decal on both machines, and each ammo type's trail and muzzle effect came from its own fields.
- 22 drone hits in 5 seconds left no marks. Shotgun blasts of 2 and 3 pellets left one mark per target on each machine.
- Marks were gone about 1.5 to 1.8 s after they appeared. There were no warnings from the mark or shot-cue logs, no material compile failures and no rejected shots or hits.

Still open: real art (a Niagara ribbon for the slash, bullet-hole textures, Niagara trails with a color parameter). The shotgun leaves a wall decal only at the first pellet's end point, because the cue carries one end point. A shot that hits an enemy still ends at the wall behind it, so that wall gets a decal too. On a remote machine the enemy can be a few centimeters away from where the attacker saw it, so the mark can sit slightly off.

## Adding hit marks to your own GAS project

- **Use the effect context's source object** for "what made this hit" when a cue needs it. It replicates with the cue. Set it on every hit, even to null, so a value from the ability spec doesn't leak through.
- **Spawn cosmetic marks in the hit cue**, and keep the predicted-cue / server-cue split so each machine makes exactly one.
- **Keep marks local.** A world subsystem with a per-target cap and a fade is enough. Run the lifetime on real time if you have slow motion.
- **Don't trust `ImpactPoint` to be on the visible mesh.** If your physics bodies don't hug the mesh, project a decal (attached to the hit bone, depth scaled with the body) instead of placing geometry at the point.
- **Put world decals on WorldStatic only** and use attached components or short-lived bone-attached decals on characters.
