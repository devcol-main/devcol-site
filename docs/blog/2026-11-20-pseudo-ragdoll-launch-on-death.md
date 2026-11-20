---
title: "UE5 Ragdoll Launches Into the Air on Death: Montage Auto Blend-Out, Unlimited Depenetration and Joints That Start Apart"
description: "Dead enemies in a UE5 game popped up 50-160 cm when they went limp. Three causes stacked: the death montage auto-blended back to a standing idle just before SetSimulatePhysics, Chaos pushed floor-intersecting bodies out with no speed limit (CollisionInitialOverlapDepenetrationVelocity -1), and a pack physics asset kept weapon joints locked that the death clip had pulled a metre apart. How to check for each one and fix it in C++."
date: 2026-11-20
workedOn: 2026-11-18
publishAt: 2026-11-20
track: "Ragdoll launch on death"
category: "Debugging / Animation & Cloth"
sidebar: "Ragdoll Launch on Death"
image: /blog/pseudo-ragdoll-c.jpg
outline: deep
tags: [UE5, Physics, Ragdoll, Animation, Debugging]
---

# UE5 Ragdoll Launches Into the Air on Death: Montage Auto Blend-Out, Unlimited Depenetration and Joints That Start Apart

If your corpses jump when they switch from a death animation to a ragdoll, check three things in this order: whether the death montage is auto blending out before you call `SetSimulatePhysics`, whether the bodies start inside the floor with no cap on how fast Chaos pushes them out, and whether the physics asset has joints whose two halves the death clip has pulled apart. In PSEUDO all three were true at once. Fixing the first one alone did not stop the worst cases, which is why this post covers all three and the measurement that finally showed them.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-ragdoll-c.jpg" alt="The death clip blended back to idle, and locked weapon joints yanked the corpse up." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-ragdoll-c-dark.jpg" alt="The death clip blended back to idle, and locked weapon joints yanked the corpse up." loading="lazy">
</figure>

## How the death worked, and how often it went wrong

Enemy death in PSEUDO (UE 5.8.3) lives in a reaction component on the character. It plays a directional section of a death montage, turns movement off, and starts a timer for the section's length. When the timer fires, `StartRagdoll` turns the skeletal mesh's bodies dynamic and the corpse falls from its last pose. The reaction build log covers why I chose "clip first, then ragdoll" over an instant ragdoll: [Hit Reactions, a Groggy Gauge and Break-Fall in UE5 GAS](./2026-11-17-pseudo-hit-reactions-groggy-break-fall).

The report was simple: monsters sometimes bounced into the air when they went limp. To measure it I added a debug console variable, `pseudo.Ragdoll.Probe 1`, that logs one line per corpse and per machine with the pelvis's rise above its lowest point after the death. I counted over the last 0.5 s of the death clip and the 3 s after the limp, and called anything above 50 cm a launch. Before the fix, 47 of 60 open-floor deaths (30 kills, read on the host and on the client) rose more than 50 cm. Some enemies did it on every death, others on most.

The first thing I ruled out was an impulse. There is no `AddImpulse`, `AddForce` or `SetPhysicsLinearVelocity` anywhere in the game code, death cancels the reaction ability (its root motion tasks end by zeroing velocity), and movement is disabled. Nothing was pushing the corpse on purpose.

## Cause 1: the montage blended back to a standing idle before the ragdoll started

This was the main cause, and it affected every enemy. My first probe started measuring at the moment the ragdoll began, so it never saw it. A per-frame pelvis trace from the kill onward found it in one run. On a super minion death the pelvis was lying at z 26 from 1.4 s, came back up to z 88 (standing height) between 1.85 and 2.0 s, and the ragdoll started at 2.05 s.

The code only turned off `bEnableAutoBlendOut` on the montage instance for deaths with no ragdoll. With a ragdoll, auto blend-out stayed on, so the montage started blending out its `BlendOut` time before the end of the section, and the pose went back to the animation blueprint's idle. Movement is off during death, so idle meant standing. The timer was set to the section length, so it fired after the blend-out had already lifted the body 60 to 110 cm. `StartRagdoll` then turned a standing body dynamic, and it fell a second time.

The fix is two calls when the death section starts: never auto blend out, ragdoll or not, and don't let the montage run on into the next section.

```cpp
// The last frame of the death section holds until the body goes limp
Montage_SetNextSection(Section, NAME_None);
```

with `bEnableAutoBlendOut` set to false on the montage instance. The rule I took from this applies to any montage that hands over to physics or has to hold a pose: turn off auto blend-out, because a timer at the section length fires after the blend-out has started.

## Cause 2: bodies that start inside the floor, pushed out at any speed

With the blend-out fixed, a probe at `StartRagdoll` showed that every ground death started with some bodies overlapping the floor. A death clip's last pose nearly always has a few capsules in the ground. In the first physics step those bodies moved at 400 to 1700 cm/s, and one minion's pelvis rose 41 to 50 cm from it.

Chaos pushes bodies that start inside other geometry out at `CollisionInitialOverlapDepenetrationVelocity`, and the project default is -1, which means no limit, unless a body overrides it with `FBodyInstance::MaxDepenetrationVelocity`. I now set a cap on every body before turning simulation on, from a project setting (`RagdollMaxDepenetrationVelocity`, 50 cm/s; a negative value falls back to the engine default). The bodies still come out of the floor, slowly enough that they don't throw the rest of the skeleton.

The animation's own velocity also carried into the ragdoll. Body speeds right after `SetSimulatePhysics` were 0 to 1095 cm/s (the high end on a knockback death). That contributed, so the bodies' linear and angular velocities are now zeroed right after they turn dynamic. The corpse drops from the death pose instead of continuing the clip's motion.

## Cause 3: a weapon joint the death clip had already broken

One enemy, the Paragon super minion, still rose 69 to 151 cm with the first two fixes in. Its `hand_r` body moved at 3407 cm/s in the first step on every death.

I dumped its physics asset with a temporary console command. Each hand has a weapon body jointed to it: boxes of 12 x 56 x 225 cm, 44 kg. Reading the bones on the last death frame showed why that mattered. The `weapon_r` bone was 118 cm from `hand_r`, while standing it is 20 cm away. The death clip drops the blades. The physics asset still holds them to the hands with a locked linear joint, so in the first step the solver closed a one-metre gap, flinging the hand at about 34 m/s and the corpse with it.

I tested a few options in memory before choosing a fix:

| Change | Result |
|---|---|
| Weapon-vs-body collision off | No change |
| Weapon collision off entirely | Mean rise 32 cm, still 103 cm max |
| Weapon joints set free on the angular axes | No change (the linear part is locked) |

So the fix is in code and covers any pack asset with the same problem. Before simulating, `StartRagdoll` checks every joint in the physics asset. It works out where each half places the joint in the animated pose, and if those two points are more than `RagdollMaxJointGap` apart (20 cm; 0 keeps every joint), it releases that joint with `FConstraintInstance::TermConstraint`. A joint that the animation is holding together has both points in the same spot; one that the clip broke does not.

```cpp
for (FConstraintInstance* Joint : Mesh->Constraints)
{
	// Where each half puts the joint in the animated pose; a held joint has both in one spot
	const FVector ChildSide = (Joint->GetRefFrame(EConstraintFrame::Frame1) * Mesh->GetBoneTransform(Child)).GetLocation();
	const FVector ParentSide = (Joint->GetRefFrame(EConstraintFrame::Frame2) * Mesh->GetBoneTransform(Parent)).GetLocation();
	if (FVector::Dist(ChildSide, ParentSide) > Settings->RagdollMaxJointGap)
	{
		Joint->TermConstraint();
	}
}
Mesh->SetAllBodiesSimulatePhysics(true);
Mesh->SetSimulatePhysics(true);
Mesh->SetAllPhysicsLinearVelocity(FVector::ZeroVector);
Mesh->SetAllPhysicsAngularVelocityInRadians(FVector::ZeroVector);
```

The dropped blades now lie loose on the floor next to the body. My test reset stands corpses back up, so the alive branch calls `RecreatePhysicsState()` to bring the released joints back. A second kill after a reset rose 11 cm. The physics asset side of this is the [constraint setup in the Physics Asset Editor](https://dev.epicgames.com/documentation/en-us/unreal-engine/editing-physics-asset-constraints-in-unreal-engine); you could also fix the asset by hand, but a code check catches the next enemy pack too.

## Two suspects that turned out to be something else

A client-only 69 cm rise on the super minion looked like the mesh, still attached to the capsule, being moved by client movement smoothing. The same case later rose 69 cm on the server too, so it was the weapon joint.

One enemy, Crunch, kept showing a big rise. A trace showed that its death clip itself leaps back (pelvis from 103 to 200 cm, feet from 9 to 127 cm) before it lands. After the limp it rose 11 cm. That is authored motion, which is why the probe only counts the clip's last 0.5 s plus the ragdoll.

## Results after the fix

All runs were in the editor with a listen server and one client, one probe line per corpse and per machine. "Before" is the same build with the fix switched off by a temporary console variable that was removed before merging.

| Where (six enemy types; plain, knockback, launch, down and launch-hit kills) | Kills | Before: launches / lines, max | After: launches / lines, max |
|---|---|---|---|
| Open floor, and corpse on corpse | 36 | 65 / 84, 160 cm | 0 / 84, 18 cm |
| 100 cm in front of a wall, pushed into it | 30 | 45 / 60, 141 cm | 0 / 60, 42 cm |
| 20 degree ramp (12 m), body 250 cm from its low edge | 30 | 52 / 60, 112 cm | 12 / 60, 74 cm |
| 20 degree ramp (20 m), body in the middle | 30 | - | 0 / 60, 38 cm |

The 12 lines on the short ramp were corpses tipping over its low edge: the legs drop off and lever the pelvis up at about 18 cm/s, with no pop. In the middle of a longer ramp there were none. A final run on all ten enemy types, with the A/B switch removed, had no ragdoll rise over 23 cm. Its four lines over 50 cm were Steel's own death leap (+73 cm inside its 0.78 s clip, +3 cm after the limp).

The ragdoll still falls the way it should. Killed at the top of a launch, with the feet about 2.4 m up, a body goes limp after 0.05 s, drops from z 328 to 35 in 0.83 s, bounces once by 11 cm and rests at z 29. Ground deaths settle within a second.

## Checking your own death-to-ragdoll handover

- **Trace the pelvis from the kill, not from the limp.** Log its height every frame from the death until a few seconds after the ragdoll starts. If it rises before the ragdoll starts, the montage is blending out. If it rises in the first physics steps, it is depenetration or a joint. Starting the measurement at the ragdoll is what hid the main cause from me.
- **Turn off auto blend-out on the death montage** and stop it from moving to the next section, so the last frame holds until physics takes over.
- **Cap the push-out per body** with `SetMaxDepenetrationVelocity` before simulating, or set `CollisionInitialOverlapDepenetrationVelocity` in the project's physics settings. With the default -1 it is unlimited.
- **Zero the bodies' velocities** right after `SetSimulatePhysics` if you want the corpse to fall from the pose rather than carry the clip's motion.
- **Check joint gaps on the last death frame** when you add an enemy from a pack. If a prop bone ends up far from the bone it is jointed to, either release the joint in code as above or change the physics asset.

Related: [Two Enemies Nothing Could Hurt: Meshes With No Physics Asset in UE5](./2026-11-06-pseudo-buff-enemies-no-physics-asset) is another case where a pack enemy's physics asset decided how combat behaved.

Related: two later ragdoll bugs, corpses that jump seconds after going limp and corpses that climb a slope, are in [Ragdoll Corpses That Jump Seconds Later or Climb a Slope](./2026-11-22-pseudo-ragdoll-corpse-jumps-climbs-slope).
