---
title: "A Large UE5 Enemy That Twitches While Strafing: Detour Crowd MaxAgentRadius and the Braking Frame"
description: "A 140 cm-radius enemy jittered forward and back about 20 times a second when it moved off after an attack. The cause was UCrowdFollowingComponent steering an agent wider than the UCrowdManager's MaxAgentRadius (100 cm by default): some frames got no requested velocity and CharacterMovementComponent braked. How to spot the saw-tooth in a speed log and the one-line fix."
date: 2026-11-20
workedOn: 2026-11-18
publishAt: 2026-11-20
track: "Detour Crowd jitter"
category: "Debugging / Movement & Combat"
sidebar: "Crowd Agent Too Wide"
image: /blog/pseudo-crowd-radius-c.jpg
outline: deep
tags: [UE5, AI, Navigation, Detour Crowd, Debugging]
---

# A Large UE5 Enemy That Twitches While Strafing: Detour Crowd MaxAgentRadius and the Braking Frame

An AI character that uses `UCrowdFollowingComponent` must not be wider than the crowd manager's `MaxAgentRadius`, which is 100 cm unless you change it in config. PSEUDO's biggest enemy has a 140 cm capsule. At reduced speeds, Detour's crowd steering gave it a usable velocity on only two of every three frames, the movement component braked on the third, and the 4.8 m body twitched forward and back about 20 times a second. If you have a large enemy with the same kind of jitter, this post shows how to confirm the cause from a per-frame speed log and two ways to fix it.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-crowd-radius-c.jpg" alt="A 140 cm agent in a 100 cm crowd got no velocity on some frames and braked." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-crowd-radius-c-dark.jpg" alt="A 140 cm agent in a 100 cm crowd got no velocity on some frames and braked." loading="lazy">
</figure>

## The twitch only showed after an attack

Prime_Helix is PSEUDO's widest enemy, a 4.8 m creature with a 140 cm capsule radius. The report was heavy jitter when it started moving after an attack. Its attacks themselves were fine: the swipe stopped where it should and the slam landed.

After an attack the enemy usually strafes, because its attacks are on cooldown or it has no attack token (the tokens limit how many enemies attack a player at once; the [enemy AI page](/wiki/pseudo/systems/enemy-ai) explains them). It strafes at 0.6 of its 420 cm/s walk speed, so 252 cm/s. The jitter happened there, and in its slower moving attacks. At full chase speed I never saw it, which is why it looked tied to attacks.

## Logging speed per frame, not only rotation

"Jitter" on a character often means rotation fighting, so I started with yaw. I wrote a probe that records, for 1 s after every montage end, on the server copy and the client copy: the actor and mesh yaw change per frame, sign flips of that change, flips of the velocity heading, speed reversals (sign changes of a per-frame speed change larger than 15 cm/s), mesh steps that go backward, the movement mode, the path-following status, the strafe flag and the move destination.

Each row below was one hypothesis, checked against that data:

| Hypothesis | Check | Result |
|---|---|---|
| Controller desired rotation fights orient-to-movement, or yaw snaps at the montage end | Enemies use `bUseControllerDesiredRotation` only. Max 0.4 deg per frame, 0 yaw flips in 17 windows | Ruled out |
| Root motion from the montage or locomotion clips | Root motion comes from montages only, and the jitter happens with no montage playing | Ruled out |
| The path is requested again every tick, or the State Tree re-enters Strafe and stops movement each time | Path following stays `Moving`, the strafe flag stays on, the destination is the same for the whole second | Ruled out |
| Velocity is braked on some frames | Speed per frame: 0, 34, 68, 102, 120, **53**, 87, 118, **52** ... and never reaches 252 | Confirmed (the mechanism) |
| Crowd steering produces it | `suspend_crowd_steering(True)` on the live enemy: max reversals 2 instead of up to 37 | Confirmed |
| It depends on size and speed | One scripted 500 cm sideways move: 1 reversal at 420 cm/s, 54 reversals in 2.5 s at 252 cm/s. Crunch (radius 50, same strafe speed, crowd on): 0 to 3 reversals | Only the 140 cm agent, only at reduced speed |
| Client smoothing makes it worse | The client shows the same saw-tooth, plus up to 5 backward mesh steps per window | Follows the server; not a separate cause |

The speed drops were between 65 and 98 cm/s. That is exactly one frame of `CharacterMovementComponent` braking with this enemy's settings (braking friction 2, ground friction 8, plus 2048 braking deceleration, times the frame time). So on those frames the movement component had no requested move at all, and it applied friction:

```
before  t(s)  0.000 0.017 0.033 0.050 0.067 0.083 0.100 0.117 0.134 0.150 0.167 0.183 ...
        spd   0     34    68    102   120   53    87    118   52    86    116   51   ...  (max 252, never reached)
after   t(s)  0.000 0.033 0.067 0.100 0.134 0.167 0.200 ... 0.967
        spd   0     34    102   171   239   252   252   ... 252
```

The capsule moved 2 to 3 cm forward, 1 cm, forward again. That is the visible twitch, and it reached clients as movement corrections.

## Why a 140 cm agent breaks Detour's crowd

PSEUDO's AI controller uses `UCrowdFollowingComponent`, and every ground enemy that takes part in attack tokens was set to `ECrowdSimulationState::Enabled`, so they separate from each other. The crowd is Detour's `dtCrowd`, wrapped by `UCrowdManager`. The manager is set up for agents up to `UCrowdManager::MaxAgentRadius`, a config value that defaults to 100 cm and is described in the engine as the max radius of an agent that can be added to the crowd. It sizes the proximity grid and the extents used to find the nearest navmesh polygon.

For the 140 cm agent at strafe speed, the crowd's steering path (`updateStepSteering` and `updateStepAvoidance`, then `UCrowdManager::ApplyVelocity`, then `RequestDirectMove`) produced a usable velocity on only two of every three frames. I did not isolate which Detour step dropped it; the probe sees the result, not Detour's internals. The size and speed dependence, and the fact that suspending crowd steering removed it, pin it to the crowd steering. On the missing frame `CalcVelocity` had no requested move and braked.

Epic's page on [using avoidance with the navigation system](https://dev.epicgames.com/documentation/en-us/unreal-engine/using-avoidance-with-the-navigation-system-in-unreal-engine) covers how to turn Detour Crowd avoidance on. The radius limit is in `UCrowdManager` and `DetourCrowd.cpp` (`init`, where the query extents and the proximity grid are set up), so it is worth knowing before you add a large creature to an existing crowd.

## The fix: path following for wide bodies, still an obstacle for the rest

Bosses in PSEUDO were already `ObstacleOnly`: they path-follow normally, and the other agents still steer around them. I extended that rule to any body wider than the crowd's limit. A helper reads the crowd manager's `MaxAgentRadius` (it is a protected config property, so I read it by reflection and fall back to 100 if it is not found), and `ConfigureCrowd` compares it with the enemy's capsule radius and the radius in its data:

```cpp
else if (Data->bExemptFromAttackTokens || !Data->StateTree || IsStationary()
	|| FMath::Max(PseudoAI::CapsuleRadius(GetPawn()), Data->CapsuleRadius) > PseudoAI::CrowdMaxAgentRadius(GetWorld()))
{
	Crowd->SetCrowdSimulationState(ECrowdSimulationState::ObstacleOnly);
}
```

Only Prime_Helix was affected. Every other crowd-steered enemy has a radius of 70 cm or less.

The other option is to raise `MaxAgentRadius` under `[/Script/AIModule.CrowdManager]` in `DefaultEngine.ini`. I kept that for a future huge enemy that really has to steer around the others, because it changes the grid and the extents for every agent, and the whole crowd would need testing again.

## Results

Same probe, `L_TrainingRoom`:

| Run | Montage ends | Max speed reversals in a 1 s window | Yaw max (deg/frame), flips | Client backward steps |
|---|---|---|---|---|
| Before, 1 player, 60 s free fight | 17 | 37 (6 of 17 windows at 10 or more) | 0.4, 0 | - |
| Before, listen server + 1 client, 40 s | 11 | server 19, client 15 | client 8.4 (one teleport turn), 0 | 5 |
| After, 1 player, 60 s free fight | 17 | 2 | 0.5, 0 | - |
| After, 1 player, all 8 attacks forced (24 ends) | 24 | 3 | 0.9, 1 flip max | - |
| After, listen server + 1 client, 50 s | 6 | server 1, client 1 | client 1.4, 0 | 2 |
| Crunch (control), 30 s, before / after | 6 / 6 | 3 / 2 | 0.8 / 1.3, 0 | - |

In the forced run one window reached 7: that was a re-path after the test teleported the player, with the heading turning smoothly from 0 to 150 degrees, no saw-tooth. The two client steps after the fix include one 3 cm settle when a moving swipe stops.

## If your large AI character jitters

1. **Log speed every frame** along with the path-following status and the destination. A saw-tooth in speed with a constant destination and a steady `Moving` status means frames where nothing requested a move.
2. **Compare the drop with one frame of braking.** If the drop matches your braking friction and deceleration for one frame, the movement component is braking, not being pushed.
3. **Suspend crowd steering on the live agent** (in editor Python, `CrowdFollowingComponent.suspend_crowd_steering(True)`). If the saw-tooth goes away, it is the crowd.
4. **Compare the capsule radius with `MaxAgentRadius`.** Anything wider either becomes `ObstacleOnly` or needs the crowd's limit raised for everyone.
5. **Test at reduced speed.** At full chase speed I never saw it; the strafe and the moving attacks are where it showed.

Related: [UE5 Enemy Melee That Whiffs on a Standing Player](./2026-11-15-pseudo-boss-swing-whiffs-reach), another case of a big enemy's AI not matching what its body and clips actually do.
