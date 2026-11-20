---
title: "UE5 Ragdoll Corpses That Jump Seconds Later or Climb a Slope: Ragdoll Self-Collision, Joint Limits and a Death Pose Inside the Ground"
description: "Dead enemies in a UE5 game looked settled, then jumped 25-160 cm three to five seconds after going limp, and on a 20 degree ramp they slowly climbed uphill. The causes: ragdoll bodies colliding with each other in the death pose, joints bent past their physics asset limits, and a flat-ground death clip ending deep inside a slope. Fixed by ignoring the PhysicsBody channel, a short damped start and an instant ragdoll on steep floors."
date: 2026-11-22
workedOn: 2026-11-20
publishAt: 2026-11-22
track: "Corpses jump and climb"
category: "Debugging / Animation & Cloth"
sidebar: "Late Corpse Jumps"
image: /blog/pseudo-corpse-c.jpg
outline: deep
tags: [UE5, Physics, Ragdoll, Animation, Debugging]
---

# UE5 Ragdoll Corpses That Jump Seconds Later or Climb a Slope: Ragdoll Self-Collision, Joint Limits and a Death Pose Inside the Ground

If a ragdoll in your game lies still and then jumps several seconds later, read the speed of each body, not its position: in my case the bodies were shaking at up to 15 m/s while the corpse looked motionless, because overlapping ragdoll bodies kept colliding with each other. Turning off ragdoll-to-ragdoll collision with `SetCollisionResponseToChannel(ECC_PhysicsBody, ECR_Ignore)` and damping the first 0.6 s fixed it. A second bug, corpses slowly climbing a slope, came from a death clip authored on flat ground ending with half the body inside the ramp. Both follow the fixes in my earlier post on [ragdolls that launch at the moment of death](./2026-11-20-pseudo-ragdoll-launch-on-death), and both turn on the same detail from that post: a 50 cm/s cap on how fast Chaos pushes overlapping bodies apart.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-corpse-c.jpg" alt="Ragdoll bodies overlapping in the death pose fought their joints until the corpse jumped." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-corpse-c-dark.jpg" alt="Ragdoll bodies overlapping in the death pose fought their joints until the corpse jumped." loading="lazy">
</figure>

## Where the earlier fix left off

Enemy death in PSEUDO (UE 5.8.3) plays a death clip, holds its last frame and then turns the skeletal mesh's bodies dynamic. The earlier fix made three changes at that handover: the death montage never auto blends out, every body gets a capped `MaxDepenetrationVelocity` (a project setting, `RagdollMaxDepenetrationVelocity`, 50 cm/s), and the weapon joints that the clip pulls apart are let go. My probe for that fix measured the pelvis rise until 3 s after the limp, and it reported 1 to 3 cm.

A few days later dead minions in the training room were still jumping. A new monitor that followed every corpse on both the host and a client, every frame, until the corpse was hidden 5 s after death showed why the old probe missed it: the jumps started 3 to 5 s after the limp, outside the window it measured. On the Paragon super minion the pelvis rose 26 to 157 cm, at up to 4.3 m/s upward.

## A corpse that looked still and wasn't

I went through the usual suspects first. Nothing in the room was touching the corpse: player weapons have no collision, capsules are ignored by the Ragdoll profile, and a single kill with nobody else around still jumped at 3.4 s. The death montage was held at its end the whole time. Turning off every angular drive on the live corpse changed nothing (46 to 121 cm). Letting the dropped blades' joints go in three different ways didn't help either.

The measurement that found it was the linear speed of every body, per frame. On a normal melee minion the bodies settle below 15 cm/s after about a second and go to sleep at 2.8 s. On the super minion they moved at 200 to 1500 cm/s from the moment of the limp, arms first, then head and neck, while their positions changed by only a few centimetres. That is a high-frequency shake, and it never stopped.

Then I switched the mesh's response to the `PhysicsBody` channel to Ignore at the ragdoll start, as a temporary test. The shaking was gone (top body speed under 35 cm/s after 1 s), and 0 of 10 super minion deaths rose more than 1 cm.

## Why overlapping bodies vibrate under a push-out cap

The super minion's physics asset is from the Paragon pack, which is set up for hit detection and partial physics, not full ragdolls. It leaves collision on between bodies that overlap in the death clip's last pose. When two bodies start inside each other, the solver separates them, but no faster than each body's `MaxDepenetrationVelocity`. The joint between them pulls them back together. Every frame the same pair is pushed apart and pulled back, the bodies vibrate, and after a few seconds the stored motion throws the corpse.

The cap is still right for the floor: setting it back to unlimited fixed most super minion cheat kills, but every other minion popped 37 to 84 cm at the limp again, which was the original problem.

A first version of the fix disabled collision only between a corpse's own bodies. That exposed a second case: an enemy that goes limp on top of an older corpse starts inside it, and both lifted 15 to 33 cm. Ignoring every ragdoll body, the corpse's own and other corpses, covers both. The corpse still collides with the world.

## Joints bent past their limits snap back at the limp

With self-collision off, the late jumps were gone, but some super and ranged minions still popped 6 to 48 cm in the first half second. Freeing every joint's angular motion as a test brought the maximum down to 0.2 cm over six kills, which pointed at the joint limits. The death clips bend some joints (arms against the spine, head, knees) past the angular limits in the physics asset. When the bodies turn dynamic, the solver moves them back inside the limits within a few steps, and that correction leaves the bodies with speed, so the pelvis pops up.

I tried two ways to keep the limits from fighting the pose. Scaling the limits up to the pose with `SetAngularDOFLimitScale`, or freeing only the axes past their limit, made things worse over 24 kills: the ranged minion still popped 26 to 32 cm, and with floppy joints the late rises came back. What worked was heavy linear and angular damping for a short time after the limp. Damping 10 for 0.4 s still let one super minion rise 48 cm in 22 kills. Damping 20 for 0.6 s kept 12 kills under 3 cm, and that is what shipped.

A body killed in the air is not damped. It should fall at full speed, and it does: free fall from 325 to 36 cm in 0.79 s.

## The second bug: corpses climbing a ramp

The earlier fix had one open case: on a 20 degree ramp, a corpse slowly rose 45 to 70 cm. My first reading was that the body tipped over the ramp's low edge and levered the pelvis up. A per-frame trace of the bone heights ruled that out. The pelvis rose from 47 to 105 cm while `foot_l` climbed from 121 to 229 cm at a steady 50 cm/s for 2 s. A steady 50 cm/s is exactly the push-out cap, so a body was being pushed out of geometry, not levered.

The death clips are authored on flat ground. The capsule stands on the slope at its centre, so when the clip ends in a flat lying pose, the uphill half of the body sits up to about 50 cm inside the ramp. The capped push-out lifted those limbs out slowly, and the rest of the corpse came with them up the slope. Lowering the cap to 0 left the bodies inside the ramp, so that was no fix.

The fix was to skip the clip on steep ground. Before playing the death clip, the reaction component traces the floor in three places (under the feet, 1 m in front and 1 m behind, against WorldStatic and WorldDynamic) and takes the steepest angle. Above 10 degrees (`RagdollSlopeLimpAngle`, a project setting, 0 turns it off), the enemy goes limp after 0.01 s, the same path a death in the air already used, and falls onto the slope with its real shape. Its start damping lasts 0.2 s, enough for the joint snap without slowing the collapse.

## The changes in C++

All in the enemy's reaction component, at the start of the ragdoll:

```cpp
// After the Ragdoll collision profile: collide with the world only
Mesh->SetCollisionResponseToChannel(ECC_PhysicsBody, ECR_Ignore);
```

- Every body gets linear and angular damping `RagdollStartDamping` (20) for `RagdollStartDampingTime` (0.6 s), then a timer restores each body's own damping. Skipped for deaths in the air, 0.2 s for deaths on a slope.
- The death clip is skipped when the steepest floor angle is above `RagdollSlopeLimpAngle`.
- The test reset restores the mesh's own collision profile, so the channel change does not leak into a respawned enemy.

The trade-off: corpses lying on each other overlap instead of stacking, and physics props of object type `PhysicsBody` are not pushed by corpses. In this game corpses are hidden shortly after death, so I accepted both.

## Results on the host and the client

Real sword kills in the training room (combos, fights with the enemy attacking, launches), pelvis rise from the limp until the corpse is hidden, on both machines:

| Build | Kills | Server max / deaths over 5 cm | Client max / deaths over 5 cm |
|---|---|---|---|
| Earlier fix only | 13 | 137 cm / 9 | 26 cm / 8 |
| + ignore ragdoll bodies | 22 | 35 cm / 3 (pops at the limp) | 30 cm / 2 |
| + damping 20 for 0.6 s | 21 | 3.7 cm / 0 | 4.0 cm / 0 |

On the ramp, Crunch went from a 60 to 67 cm climb to a 6 to 12 cm snap in the first 0.15 s with no rise after it. Narbash went from 45 to 49 cm to 0 to 5 cm, the super minion from 15 to 19 cm to 0 to 7 cm.

One enemy is still open. Steel's physics asset has only six bodies, with each hand at 171 kg. On flat ground it lies still, but on a slope the corpse rocks and rises 130 to 165 cm. A generated physics asset would fix the ragdoll, but it would also change where player hits land on that enemy, so it needs a separate decision.

## Checking your own ragdolls

- Watch a corpse until it disappears. A slow instability can take seconds to show, so a probe that stops after 3 s can report a clean result for a corpse that jumps at 4.
- Log per-bone linear velocity (`GetPhysicsLinearVelocity` on each bone), not only positions. A corpse that looks still can be shaking at metres per second.
- If a corpse rises at a constant speed, compare that speed with your `MaxDepenetrationVelocity`. A match means a body started inside something.
- Pack physics assets often leave self-collision on between overlapping bodies. For corpses, ignoring the `PhysicsBody` channel costs little.
- If a death pose bends joints past their limits, damp the first fraction of a second instead of loosening the limits.
- Death clips are flat-ground content. Anything that ends in an authored lying pose should check the floor angle before it plays.
