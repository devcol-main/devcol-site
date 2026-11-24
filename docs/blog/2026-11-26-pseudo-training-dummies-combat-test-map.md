---
title: "Training Dummies in UE5 Without a New Enemy Class: A Data-Asset Flag, a Health Floor Tag and a Per-Hit Damage Breakdown Log"
description: "How I built a combat test map and training dummies for a UE5 GAS action game by reusing the real enemy: one component switched on from the enemy data asset, a State.Unkillable tag that floors health at 1 in PostGameplayEffectExecute, a walk-home and full reset after hits, replicated damage numbers, a per-hit damage formula breakdown in the log, and attacking dummies that run the real enemy attack ability on a fixed rhythm."
date: 2026-11-26
workedOn: 2026-11-01
publishAt: 2026-11-26
track: "Test map"
category: "Build Logs"
sidebar: "Training Dummies"
image: /blog/pseudo-dummies-c.jpg
outline: deep
tags: [UE5, GAS, AI, Tools, Combat, Multiplayer]
---

# Training Dummies in UE5 Without a New Enemy Class: A Data-Asset Flag, a Health Floor Tag and a Per-Hit Damage Breakdown Log

Testing combat on the normal game map meant fighting enemies that chase, die and respawn, which is a slow way to check one damage number. So I built a separate combat test map in PSEUDO with training dummies: one that never dies and shows damage numbers, one that never moves and logs the whole damage formula for every hit, and five that each throw one kind of attack at you on a fixed beat. If you are building the same thing, the decision worth copying is that none of them is a new enemy class. They are the real enemy Blueprint with a different data asset, and the dummy behavior is a component that every enemy carries and only dummies switch on. Every hit therefore goes through the same ability, damage execution and defense code as a real fight.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-dummies-c.jpg" alt="Training dummies are real enemies with a data-asset flag, so every hit runs the real combat code." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-dummies-c-dark.jpg" alt="Training dummies are real enemies with a data-asset flag, so every hit runs the real combat code." loading="lazy">
</figure>

## A data-asset block instead of a dummy class

Each PSEUDO enemy is defined by a data asset (`UPseudoEnemyData`: stats, attacks, AI ranges, reactions). I added a **Training** block to it with `bEnabled` off by default, and a `UPseudoTrainingDummyComponent` to the base enemy character. On a real enemy the component sees the flag is off and does nothing; the cost is one idle component per enemy. A dummy is an instance of the existing enemy Blueprint with its own data asset where the block is on.

The Training block holds everything a dummy can do: whether it can die, the reset delay, damage numbers, walking home, the breakdown log, and the attack rhythm. Seven data assets cover all the variants, and tuning any of them is an asset edit.

I considered a dummy subclass and dropped it: a subclass is one more place where a dummy can behave differently from a real enemy, and the point of a dummy is to show what real enemies would take.

## "Never dies" as a tag on the health set

The dummies have to take every hit, play every reaction, lose shield and part health, and still not die. In GAS the place where damage turns into lost health is the attribute set's `PostGameplayEffectExecute`. The dummy component adds a loose tag, `State.Unkillable`, and the health set floors the result at 1 when that tag is present:

```cpp
// PostGameplayEffectExecute
float NewHealth = FMath::Clamp(GetHealth() - HealthDamage, 0.f, GetMaxHealth());
// Training dummies: the hit still lands (reaction, numbers), only the death is skipped
if (NewHealth < 1.f && ASC->HasMatchingGameplayTag(PseudoGameplayTags::State_Unkillable))
{
	NewHealth = FMath::Min(1.f, GetMaxHealth());
}
```

Everything upstream of that line still runs, including the hit event that carries the full damage value, so damage numbers show what the hit really did, not what was left to take. The same tag will do for a god-mode cheat later.

## Resetting and walking home

A dummy that stays at 1 HP after one combo is useless for the next one. Three seconds after the last hit, the dummy does a full reset: health, shield, the groggy gauge, statuses and breakable parts. The enemy class already had a reset function for tests with exactly that scope, so the component only restarts a world timer on every "hit taken" event and calls it.

Knockbacks and launches move the dummy, and a lane where the dummy has drifted two metres is a different test. After two seconds without hits, and when it is not reacting, attacking or falling, the dummy asks its AI controller to `MoveToLocation` its placed position over the nav mesh, then sets a focal point so it faces the original direction again. If there is no path it teleports. In the test, a dummy knocked 344 cm by a real combo logged `walks home (344 cm away)` and then `back home`.

## Damage numbers every machine sees

PSEUDO had no damage pop-ups, so the dummy got a simple one: a small actor with a TextRender that rises, faces the camera, shrinks and disappears, timed on real time so slow motion does not freeze it. The dummy component spawns it from an unreliable multicast, so the host and every client see the same numbers, and no widget asset is needed. The look is a placeholder (engine font, white, orange from 100 up). There is no crit colour yet, because the hit event does not carry the crit flag.

During testing, hits triggered by an editor Python script showed numbers on the host only. That turned out to be a property of editor Python, not of the multicast: such calls run locally, which I traced later in [Gameplay Cues Never Reach PIE Clients When Fired From Editor Python](./2026-11-23-pseudo-editor-python-rpcs-run-locally). With a real greatsword combo both worlds showed the numbers.

## A breakdown line for every hit

The fixed dummy is for checking the [damage formula](/wiki/pseudo/systems/damage-formula). It never moves (its reaction resistance is set to the strongest tier, so every hit is only a flinch), never goes groggy, and never dies. When the target carries `State.DamageBreakdown`, the damage execution writes one line per hit to its own log category:

```
BREAKDOWN PseudoPlayerState_0 -> ..._C_1 Damage.Element.Physical | base 10.00 | stat scaling x1.100 ... | armor def 20.0 / k 100 -> x0.833 | ... part Part.Head x1.50 | = 15.12
```

Between those, the line has the multiplier, the additive bucket, crit, element resistance, damage taken, wake-up and part terms, in the same order and with the same names as the design document. The normal damage log is far too noisy to read one hit at a time; a separate category with one line per hit made every term checkable. In the test it took sixty knockback, down and launch hits plus one 900 launch and stayed at the same position.

## Attacking dummies that use the real attack path

Defense needs the opposite: something that attacks you, predictably, with one attack type at a time. Five attacking dummies stand in lanes at the south of the map: Normal (a light flinch), Melee (knocks you down), Stagger, Unblockable (shows the existing red warning) and Ranged (throws a rock at 1500 cm/s).

I did not give them a State Tree. The dummy component runs a fixed rhythm through the same AI controller functions the real enemy brain uses, on the server every 0.2 s:

```cpp
if (!AI->FindTarget()) { AI->ClearTarget(); return false; }
const FPseudoEnemyAttack& Attack = Attacks[0];
const float Distance = AI->GetDistanceToTarget();
const bool bInRange = Distance >= Attack.MinRange && Distance <= Attack.MaxRange;
if (bInRange && Now >= NextAttackTime && AI->SelectAttackByTag(Attack.AttackTag) && AI->StartSelectedAttack())
{
	NextAttackTime = Now + GetConfig().AttackInterval;
}
```

`StartSelectedAttack` activates the shared enemy attack ability, so the montage, notifies, hit detection and the player's guard, parry and dodge judgment are the real ones. The dummies only attack from home (a displaced one walks back first), never chase, swing every 3 s of world time, and obey the existing "freeze enemies" cheat. They never die either; respawning would have been more code for no gain in testing.

Their attacks are copies of a minion's with the poise damage set to 0, so the player's own groggy gauge does not mix into the lane results. The engage radius is 500 for the melee lanes and 1200 for the ranged lane, and each lane is wide enough that a player in one lane is only attacked by that lane's dummy, which the logs confirmed.

## The map is built by a script

<figure>
  <img src="/blog/pseudo-training-map-01.jpg" alt="Top-down editor view of the test map: three walled boss arenas at the top, the open training floor below with the dummies as small dots." loading="lazy">
  <figcaption>The test map from above (X points left in this capture). Three boss arenas along the top, the training area and the five attack lanes on the floor below.</figcaption>
</figure>

The greybox is generated by an editor Python script: floor, walls, lights, a nav mesh bounds volume over everything, a PlayerStart, text signs and every dummy. Lane positions are a list at the top of the script, so moving a lane means editing the list and rebuilding, not dragging actors. The default game map is untouched; a cheat, `PseudoTravel Combat`, opens the test map, and which map that is lives in project settings.

North of the training area are three boss arenas. One holds the existing boss at scale 1 with its engage radius and boss bar; the other two are empty until their bosses are designed.

<figure>
  <img src="/blog/pseudo-training-map-02.jpg" alt="Inside the boss arena: the boss close to the camera with motion blur, its health bar at the top of the screen." loading="lazy">
  <figcaption>The boss arena in play: the fight starts inside the engage radius and the boss bar appears at the top.</figcaption>
</figure>

## What the test run covered

On a listen server with one client:

- The combo dummy went from 100 HP to 1.0 under staggers, knockbacks and launches, never got the dead tag, played every reaction, and reset to 100 three seconds after `3 hits / 531.7 damage`.
- Every attacking dummy logged its attacks exactly 3.0 s apart.
- Guard against the Normal lane: 8.0 base times 0.30. The Stagger lane staggered the player on both machines; guarded, it was answered as a guard.
- Unblockable: `guarding 1, type Unblockable -> None`, full damage plus knockback, the red warning on server and client, and a dash 0.2 s into the swing took no hit.
- The ranged rock hit for 8.0 base and staggered the player on both machines.
- A launched attacking dummy walked home and resumed attacking.

## If you are building a test room

- **Reuse the real enemy.** A flag in its data and an idle component beat a dummy subclass that can drift from the real thing.
- **Skip death at the attribute, not at the hit.** A floor on health in `PostGameplayEffectExecute`, gated by a tag, keeps reactions, numbers and part damage intact.
- **Reset with what you already have.** If your enemies have a test reset, restart a timer on every hit and call it.
- **Walk home on the nav mesh** with a teleport fallback, so lanes stay valid after knockbacks.
- **Give the formula its own log category, one line per hit,** with the same term names as your design document.
- **Drive attacking dummies through the real attack functions** on a fixed timer instead of a behavior tree, so lanes test the defense code and nothing else.
- **Generate the map from a script**, so the layout survives your changes to it.
