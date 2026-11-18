---
title: "UE5 Enemy Melee That Whiffs on a Standing Player: AI MaxRange and Facing vs. Where the Clip's Weapon Lands"
description: "A boss in PSEUDO missed a player who stood still in front of him. The hit traces were fine. The AI started swings from past the weapon's reach, and two clips bring the hammer down to the side, not on the line the AI faces. Fixed with reach-based ranges, a per-attack facing offset in UpdateControlRotation and a late turn lock."
date: 2026-11-15
workedOn: 2026-11-14
publishAt: 2026-11-15
track: "Boss swings whiff"
category: "Debugging / Movement & Combat"
sidebar: "Boss Swings Whiff"
image: /blog/pseudo-swing-reach-c.jpg
outline: deep
tags: [UE5, AI, Animation, GAS, Combat, Debugging]
---

# UE5 Enemy Melee That Whiffs on a Standing Player: AI MaxRange and Facing vs. Where the Clip's Weapon Lands

If your enemy's melee attack misses a player who doesn't move, check two numbers against the animation before you touch the hit traces: how far the weapon really reaches during the hit window, and in which direction it lands. In PSEUDO the traces worked. The AI started swings from a distance the hammer could barely reach, and two of the three swing clips bring the hammer down beside the boss's right foot while the AI kept the player dead ahead. The fix was data plus one override: ranges taken from the measured reach, and a per-attack yaw offset so the body turns until the player sits where the weapon comes down.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-swing-reach-c.jpg" alt="Boss hammer swings missed a still player: started out of reach and landed beside the body." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-swing-reach-c-dark.jpg" alt="Boss hammer swings missed a still player: started out of reach and landed beside the body." loading="lazy">
</figure>

The enemy is Sevarog, a large boss built from Paragon's Sevarog character asset, running at 1.5x body scale in the shipped setup. He has three single hammer swings plus a few area and projectile attacks. Enemies in PSEUDO share one AI controller, one State Tree and one attack ability; each enemy's data asset lists its attacks with a montage, a range, a cooldown and the mesh sockets used for the hit trace. The [Enemy AI](/wiki/pseudo/systems/enemy-ai) page describes that setup.

## Swing 2 and Swing 3 never connected

I measured a natural fight with the host standing still in front of the boss and re-placed there after each attack. At Scale 1.5 the counts (attacks started / hits) were:

| Attack | Started | Hit |
|---|---|---|
| Swing1 | 15 | 11 |
| Swing2 | 15 | 0 |
| Swing3 | 8 | 0 |

Swing2 and Swing3 also hit 0 times at Scale 1.0. A player who does nothing should get hit, and a dodge should avoid it. Here two attacks could not hit anyone.

## Eight hypotheses, two real causes and one tooling bug

The test was `L_Test_Combat` in PIE, listen server plus one client, boss AI on, host standing in front.

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The hit sockets are missing on the copied mesh | Sampled the pose offline at 1/60 s and resolved `HammerCenter`, `Weapon_01`, `Weapon_02`, `hand_r` | Ruled out: all four exist, the hammer path is sane |
| 2 | The hit window notify sits at the wrong time | Compared the band of player distances hit inside the window with the band hit anywhere in the clip | Ruled out: identical bands (contact 0.47-0.50 s, window 0.42-0.61 s) |
| 3 | The trace's object types miss the player capsule | Code read: `SweepMultiByObjectType(ECC_Pawn)` plus a narrow phase on the target's physics asset; Swing1 does hit | Ruled out |
| 4 | The server doesn't trace because the animation isn't ticking there | Hits are logged on the server, and the client's own health drops | Ruled out |
| 5 | The AI starts swinging out of reach | Compared `MaxRange` with the measured reach | **Confirmed** |
| 6 | The swing lands to the side of the target | Mapped hit distance per target bearing | **Confirmed** |
| 7 | The facing locks too early | Code read on how enemies turn during a montage | The opposite: they never stop turning |
| 8 | Data edited live in PIE doesn't reach a resized enemy | Override test | **Second bug**: a stale cache |

The first four are the usual suspects for "melee doesn't hit", and none of them was it. Both real causes came from comparing the data with the clip geometry.

## Measuring a clip's reach and bearing offline

Instead of tracing in PIE and fighting frame noise, I sampled the attack clips in the editor with the animation pose scripting functions (`AnimPoseExtensions`). For each clip I took the hit sockets' positions every 1/60 s in the boss's own space, at any body scale. Then, for a target capsule placed at a given bearing from the boss's forward direction (+ means to the boss's right) and a given centre distance, I checked whether the sockets' path crossed the capsule during the hit window. The result is a bearing map: for each bearing, the band of distances where the swing hits.

```
Swing1 1.0: -90:85-310 ... -10:85-400 +0:85-400 +10:85-385 +20:85-370 +30:85-280 +40:85-190
Swing1 1.5: -30:197-587 -20:122-587 -10:122-572 +0:122-572 +10:122-407 +20:137-212
Swing2 1.0: -10:115-160 +0:100-295 +20:85-340 +40:85-340 +60:85-370 +80:85-385
Swing2 1.5: +20:362-452 +30:242-497 +50:197-512 +60:197-542 +70:197-542 (0 at +0)
Swing3 1.0: +10:85-190 +20:85-355 +30:85-400 +40:85-385 +50:85-280 (0 at +0)
Swing3 1.5: +10:122-197 +20:122-527 +30:122-587 +40:122-557 +50:122-377 (0 at +0)
```

(Distances are centre to centre in cm, for a body 15-165 cm high and 22 cm thick.)

**Swing1 was started at its limit.** The approach step in the State Tree succeeds as soon as the target is inside the attack's `MaxRange`, measured edge to edge and multiplied by body scale. Swing1's reach straight ahead is a centre distance of 400 cm at Scale 1.0 (572 at 1.5), which is about 290 / 426 cm edge to edge. `MaxRange` was 280, so 420 at 1.5: right on the limit. From edge distances of 405-420 cm, Swing1 hit 3 times out of 10.

**Swing2 and Swing3 never cross the forward line at body height at 1.5.** Paragon's `Swing2_Slow` is a diagonal slash down to the right, and it only hits at bearings +20 to +90 degrees (best around +50 to +70). `Swing3_Slow` is a slam beside the right foot; it lands at (213, 133) cm in the boss's space at Scale 1.0, 32 degrees to the right, and only hits from +10 to +90. The AI controller faces its focus exactly (`AAIController::UpdateControlRotation` turns toward the focal point), so the player was always at bearing 0, where these two clips pass beside or over a standing body.

## Turning the boss away from the player on purpose

Without new clips, the only way to put the hammer on the player is to turn the body: if the hammer lands 30 degrees to the right, the boss should face 30 degrees to the left of the player. I added two fields to the attack entry in the enemy data:

- `FacingYawOffset` (degrees, + = target to the enemy's right). 0 keeps the old behavior.
- `TurnUntil` (montage time in seconds, < 0 = keep turning).

The controller overrides `UpdateControlRotation`. Late in the wind-up it holds the body's current yaw; before that it lets the engine do its look-at and then subtracts the offset:

```cpp
void APseudoAIController::UpdateControlRotation(float DeltaTime, bool bUpdatePawn)
{
	// Late in the wind-up: hold the current facing, the swing goes where the body points now
	APawn* const MyPawn = GetPawn();
	if (MyPawn && AttackTurnUntil >= 0.f && AttackFacingMontage.IsValid())
	{
		...
		if (Anim && Anim->Montage_IsPlaying(AttackFacingMontage.Get()) && Anim->Montage_GetPosition(AttackFacingMontage.Get()) >= AttackTurnUntil)
		{
			SetControlRotation(FRotator(0.f, MyPawn->GetActorRotation().Yaw, 0.f));
			return;
		}
	}
	Super::UpdateControlRotation(DeltaTime, bUpdatePawn);
	if (!MyPawn || FMath::IsNearlyZero(AttackFacingYawOffset) || !FAISystem::IsValidLocation(GetFocalPoint())) { return; }
	FRotator Rotation = GetControlRotation();
	Rotation.Yaw = FRotator::NormalizeAxis(Rotation.Yaw - AttackFacingYawOffset);
	SetControlRotation(Rotation);
	...
}
```

The attack ability hands the values to the controller when it activates and clears them in `EndAbility`, so the offset only exists while that attack runs. The character movement component then turns the body toward the control yaw (540 degrees per second, `bUseControllerDesiredRotation`).

```mermaid
sequenceDiagram
  participant ST as State Tree (approach step)
  participant AI as AI controller
  participant GA as Enemy attack ability
  participant CMC as Character movement
  ST->>AI: target inside MaxRange x scale -> start the selected attack
  AI->>GA: TryActivateAbility
  GA->>AI: SetAttackFacing(FacingYawOffset, TurnUntil, Montage)
  loop every tick
    AI->>AI: look at target, yaw -= offset; hold yaw once montage >= TurnUntil
    CMC->>CMC: turn body to the control yaw (540 deg/s)
  end
  GA->>GA: hit window: hammer sockets sweep, hit the player
  GA->>AI: EndAbility: SetAttackFacing(0, -1, null)
```

<figure>
  <img src="/blog/pseudo-swingreach-01.jpg" alt="Swing 2 at Scale 1.5: the boss faces about 60 degrees to the left of the player and the hammer comes down on him" loading="lazy">
  <figcaption>Swing 2 at Scale 1.5 after the fix. The boss faces about 60° to the left of the player, so the diagonal slash ends on him instead of beside him.</figcaption>
</figure>

## Why a turn lock, and why 0.06 s before the hit

Hypothesis 7 turned out backwards. Enemies tracked their target at 540 degrees per second through the whole montage, so once the facing fix made the swings land, a player strafing sideways could not get out: 7, 9 and 10 hits out of 10 for the three swings.

`TurnUntil` stops the turning at a fixed point in the montage. I tested three lock times with 30 strafing tries each (Swing1 / 2 / 3 hits):

| Lock time | Hits while strafing |
|---|---|
| 0.12 s before the hit window | 0 / 0 / 5 |
| 0.06 s before the hit window | 3 / 3 / 10 |
| At the hit window | 8 / 4 / 10 |

I chose 0.06 s before the window: about half of the strafes escape Swing1 and Swing2. Swing3 is a narrow slam and still hits a strafing player every time, so it needs a dodge or a guard.

## Ranges from the measured reach

`MaxRange` is where the attack starts, so it has to sit inside the reach with a margin. I set it to about 85 % of the shortest reach within ±10 degrees of the chosen bearing, and picked the bearing with the widest hit band at both Scale 1.0 and 1.5:

| Attack | MaxRange (edge, Scale 1) | Facing offset | Turn until |
|---|---|---|---|
| Swing1 | 220 | -10 | 0.37 s |
| Swing2 | 190 | +60 | 0.36 s |
| Swing3 | 190 | +30 | 0.39 s |

The area attacks, the projectile and the leap already hit 10 out of 10 and kept their values. Every other enemy has an offset of 0 and no turn lock, so its code path is the plain engine look-at.

## The cache that ignored live tuning on a resized enemy

While tuning in PIE I hit a second bug. An override test showed the AI picking attacks with the new ranges while the ability still used the old facing. The attack ability's `FindAttack` kept a copy of the attack entry scaled by body size, keyed only by the attack tag and the scale, and each attack has its own ability instance. That copy was built once and kept forever, so an enemy with a scale other than 1 never saw data edits made during play. The fix is to reset the scaled copy on every activation; building it once per attack costs almost nothing.

## Results

Same PIE setup, with a harness that makes the AI walk in from far away and pick only one attack from its own chosen distance:

- Still player, Scale 1.5: Swing1, Swing2 and Swing3 each 10 / 10 (before: 3, 0 and 0 out of 10). Same at Scale 1.0.
- A dash 0.15 s before the hit still avoids every swing: 0 hits in 50 tries.
- Guarding still blocks the swings as before.
- With the client as the target, every swing hit 5 / 5 and the client's own health dropped.
- In a natural 75 s fight, Swing2 hit 17 / 17 and Swing3 10 / 10. Swing1 hit 15 / 17; both misses came right after an attack that knocks the player down, with the player lying on the floor.

Not covered yet: parry, and a packaged build.

## Checking your own enemy attacks

If an enemy melee attack misses a still target and the trace itself looks correct:

1. **Measure the clip, not the timing alone.** Sample the hit sockets through the hit window and record two things: the reach and the bearing of the weapon relative to the enemy's forward. A clip from a marketplace character has no reason to swing along the actor's forward axis.
2. **Treat `MaxRange` as a start distance.** If your approach task finishes as soon as the target is inside the range, the attack begins at the range limit. Keep the range comfortably inside the reach, and remember it scales if your ranges multiply by body size.
3. **If the weapon lands off-axis, turn the body.** A per-attack yaw offset applied after the AI controller's look-at in `UpdateControlRotation` puts the target where the weapon comes down, without new animation. With an offset of 0 the behavior is the same as before, so other enemies are unaffected.
4. **Stop turning before the hit.** An enemy that tracks the player until contact can't be sidestepped. Lock the yaw at a montage time shortly before the hit window and tune that time with strafing tests.
5. **Refresh derived data per use.** A cached copy of data-derived values (scaled ranges, for example) makes live tuning silently do nothing.

Still open: at Scale 1.5, Swing2 passes over a player who stands closer than about 50 cm edge to edge. The AI never starts it from that close after an approach, but a player who walks into the boss mid-combo is safe from it. Fixing that would need a minimum range and a back-off move the AI doesn't have yet.
