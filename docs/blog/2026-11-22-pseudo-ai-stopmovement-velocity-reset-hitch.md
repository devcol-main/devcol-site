---
title: "UE5 AI That Hitches While Walking: StopMovement Resets Velocity, a Random EQS Pick Reverses the Strafe, and Unsmoothed Blend Space Inputs"
description: "Bosses and elites in a UE5 game hitched, U-turned mid-stride and popped their legs. AAIController::StopMovement and path following's arrival stop zero the velocity in one frame, a RandomBest25Pct EQS strafe query re-run against a moving player kept reversing direction, and the enemy blend space read raw Speed and Direction. How each was measured and fixed with AbortMove(VelocityMode Keep), SetStopMovementOnFinish(false), a direction rule and eased inputs."
date: 2026-11-22
workedOn: 2026-11-20
publishAt: 2026-11-22
track: "AI walk hitches"
category: "Debugging / Movement & Combat"
sidebar: "AI Walk Hitches"
image: /blog/pseudo-smooth-stop-c.jpg
outline: deep
tags: [UE5, AI, Navigation, EQS, Animation, Debugging]
---

# UE5 AI That Hitches While Walking: StopMovement Resets Velocity, a Random EQS Pick Reverses the Strafe, and Unsmoothed Blend Space Inputs

If your AI characters stop dead for a frame whenever their behaviour switches from one move to the next, look at `AAIController::StopMovement()`. It aborts the path with `EPathFollowingVelocityMode::Reset`, which sets the velocity to zero in one frame, and path following does the same when a move reaches its goal. In PSEUDO that hitch, a strafe query that kept picking spots behind the enemy, and a locomotion blend space fed with raw velocity together made bosses and elites jitter. This post shows how I measured each one, and the engine calls that fixed them.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-smooth-stop-c.jpg" alt="StopMovement zeroed the velocity in one frame, so walking enemies hitched at every switch." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-smooth-stop-c-dark.jpg" alt="StopMovement zeroed the velocity in one frame, so walking enemies hitched at every switch." loading="lazy">
</figure>

## A vague report and a per-frame probe

The report was "some bosses jitter while walking, turning and attacking", with no list of which ones. So I measured all 14 bosses and elites, plus a melee minion as a control, in one script. Each enemy was spawned 900 cm away with its AI running. The player then hopped to a new spot every 3.5 s (the enemy walks off, turns, attacks a standing target), circled the enemy at 550 cm, and finally walked a 1400 cm line in front of it. Every frame, on the host and on a client, the script logged actor and mesh yaw and location, velocity, the active montage, root motion, and the pelvis and feet in mesh space.

Measuring the rendered mesh and the bones, not just the actor, turned out to matter. Two suspects dropped out quickly:

- Rotation was clean. The yaw step changed sign at most 0.41 times per second on any enemy, the same as the controls, and bodies turned at a constant 540 deg/s.
- No enemy played root motion at all (0 frames on all 14), so montage root motion and its replication were not involved.

A crowd-steering saw-tooth like the one in my [Detour crowd post](./2026-11-20-pseudo-detour-crowd-max-agent-radius-jitter) did not come back either, apart from two enemies whose numbers the causes below explain. The hit-stop shake (the mesh moves 1 to 2 cm for 4 frames on purpose) was excluded from the tables.

## One-frame stops from StopMovement and arrival

The metric that found the first cause was simple: frames where the speed drops from above 150 cm/s to below 20 cm/s in one frame, outside attacks. Most ground enemies had 8 to 12 of them per 50 s run, the minion controls too. Every one sat at a switch between approaching and strafing, or at a move goal.

```
MinionMelee (control) strafe end:  228 -> 0 -> 34 -> 68 ...   (12 times in 50 s)
Prime_Helix strafe end:            252 -> 34 -> 68 -> 103 ...
```

The engine path: `StopMovement()` calls `AbortMove(..., EPathFollowingVelocityMode::Reset)`, `UPathFollowingComponent::OnPathFinished` then calls `UNavMovementComponent::StopMovementKeepPathing()`, which calls `StopMovementImmediately()`, and the velocity is 0. The same happens when a move reaches its goal, because `bStopMovementOnFinish` defaults to true. My state tree tasks for approaching and stepping through attack patterns called `StopMovement` in their exit, and so did the end of a strafe. A walking enemy stopped dead for one frame at every state switch and accelerated again from zero.

The fix is a smooth stop that keeps the velocity:

```cpp
void APseudoAIController::StopMovementSmooth()
{
	UPathFollowingComponent* PathFollowing = GetPathFollowingComponent();
	if (!PathFollowing || PseudoAI::CVarSmoothStop.GetValueOnGameThread() == 0)
	{
		StopMovement();
		return;
	}
	PathFollowing->AbortMove(*this, FPathFollowingResultFlags::MovementStop | FPathFollowingResultFlags::ForcedScript,
		FAIRequestID::CurrentRequest, EPathFollowingVelocityMode::Keep);
}
```

The state tree exits and the strafe end use it. With the velocity kept, either the body brakes on its own or the next move takes over at the current speed. Attacks that are supposed to start from a standstill keep the hard `StopMovement`.

For arrivals I override `MoveTo` and call `SetStopMovementOnFinish(false)` on the path following component after every request, so at a goal the body brakes over about 0.1 s and 10 cm. It has to be after every request: `UPathFollowingComponent::RequestMove` puts `bStopMovementOnFinish` back to true when it replaces an active move. My first attempt set it once in `OnPossess`, it held only until the second move, and one enemy kept stopping dead at its strafe goals.

## A strafe that kept reversing

The second cause showed up on IggyScorch, an elite that strafes a lot. With the player moving, the rendered speed went like this every 0.45 s:

```
240 240 240 240 240 147  81  45  49  75  ...
```

The enemy braked through almost zero and walked back the way it came. The strafe goal comes from an EQS query run with `EEnvQueryRunMode::RandomBest25Pct`, and the strafe update re-runs the query whenever the target leaves a tolerance circle. A moving player leaves it about twice a second, and a random pick from the best quarter has no idea which way the enemy is already walking, so it often lands behind it.

Now the query runs with `AllMatching`, and my own pick still takes a random spot from the best 25 %, but while the enemy is walking only from the spots ahead of its current direction. Behind a console variable (`pseudo.AI.StrafeKeepDirection`) like the smooth stop, so both can be compared on and off.

## Legs that popped on a velocity jump

The third cause was in the pose. Counting one-frame jumps of a foot in mesh space (a change of more than 10 cm times body scale in a single frame), IggyScorch had 3.7 per second and Prime_Helix 3.4, at exactly the frames of the two causes above. On one strafe re-goal both feet jumped about 47 cm in a single frame.

The enemy animation blueprints are copies of a minion ABP: one Blend Space Player driven by `Speed` and `Direction` straight from the velocity, and the blend spaces had an interpolation time of 0 on both axes. A one-frame velocity change was a one-frame pose change.

The anim instance now eases both inputs for enemy pawns, at 10 per second (about 0.1 s):

```cpp
const float Alpha = FMath::Clamp(DeltaSeconds * EnemyLocomotionInterpSpeed, 0.f, 1.f);
SmoothedSpeed = FMath::Lerp(SmoothedSpeed, Speed, Alpha);
if (Speed > 1.f)
{
	SmoothedDirection = FRotator::NormalizeAxis(SmoothedDirection + FMath::FindDeltaAngleDegrees(SmoothedDirection, Direction) * Alpha);
}
```

Direction turns the short way round and is held while the enemy stands still, so an idle enemy doesn't swing its blend back to 0. The blend space's own axis smoothing would have worked too.

## Before and after

Host, one-player PIE at 60 fps, 50 s per enemy, before and then two runs on the final build:

| Enemy | One-frame stops / run | Pose zigzags / s | Foot jumps / s |
|---|---|---|---|
| IggyScorch | 2 -> 0 / 0 | 2.39 -> 0.72 / 0.76 | 3.72 -> 0.26 / 0.28 |
| Prime_Helix | 10 -> 0 / 0 | 0.76 -> 0.05 / 0.29 | 3.35 -> 0.88 / 1.12 |
| Crunch | 8 -> 0 / 0 | 0.51 -> 0.15 / 0.22 | 1.30 -> 0.37 / 0.25 |
| MinionMelee (control) | 12 -> 0 / 0 | 0 | 0 |

Hit rates against a standing player stayed at 100 % for every boss tested, on host and client.

Two things are left, and neither comes from code. The two Buff enemies' walk clips pop the right foot about 21 cm once per stride at constant speed, which is in the pack clip itself. And client-side position corrections grow with walk speed (the fastest boss, at 630 cm/s, had about 13 per second), though the mesh smoothing hides most of them.

## If your AI stutters

- Don't use `StopMovement()` to hand over from one move to the next on a walking AI. Abort with `EPathFollowingVelocityMode::Keep` instead, and keep the hard stop for places where a standing start is wanted.
- If arrivals look abrupt, call `SetStopMovementOnFinish(false)` after each move request, not once.
- A random EQS pick that re-runs against a moving target needs a direction rule, or the agent dithers.
- Smooth blend space inputs that come from velocity whenever the velocity can change in one frame.
- Count one-frame velocity drops and foot jumps in mesh space, on the rendered mesh. Judge foot metrics at 60 fps: in a two-window PIE at around 22 fps every foot moves further per frame.
