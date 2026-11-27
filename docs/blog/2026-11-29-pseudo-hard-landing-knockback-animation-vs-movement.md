---
title: "Hard Landings and Knockback in UE5: One Fall Threshold From the Apex, Camera Shakes as Data, and Ending a Hit React When the Root Motion Push Ends"
description: "Two game-feel fixes in a UE5 GAS multiplayer action game where the animation and the movement disagreed: a landing recovery clip that played while the capsule kept sliding, fixed by one fall-damage threshold measured from the last apex (h = v² / 2g) shared by damage, recovery, the anim blueprint and a fall warning; and a knockback that held the player in a 1.25 s clip after a 0.25 s push, fixed by ending the ability on the root motion task's OnFinish."
date: 2026-11-29
publishAt: 2026-11-29
track: "Combat feel"
category: "Build Logs"
sidebar: "Hard Landings and Knockback"
image: /blog/pseudo-landing-knockback-c.jpg
outline: deep
tags: [UE5, GAS, Animation, Character Movement, Camera Shake, Multiplayer]
---

# Hard Landings and Knockback in UE5: One Fall Threshold From the Apex, Camera Shakes as Data, and Ending a Hit React When the Root Motion Push Ends

Two things in PSEUDO felt wrong for the same reason: an animation and the movement it was meant to show had different lengths or different triggers. After a hard landing, the recovery clip sometimes played while the capsule was still moving, so the legs stayed planted while the body slid. After a knockback, the player stood frozen in the reaction clip for about a second after the push had already stopped. If you have either symptom: use a single "hard landing" number, measured from the last apex, everywhere a landing is judged, and end a hit reaction when its movement ends rather than when its montage ends, letting the montage blend out while the player already has control.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-landing-knockback-c.jpg" alt="Landing checks used three thresholds, and a knockback outlived its push." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-landing-knockback-c-dark.jpg" alt="Landing checks used three thresholds, and a knockback outlived its push." loading="lazy">
</figure>

The jump and landing rules themselves (coyote time, fall damage, break-fall) are in [Coyote Time, Fall Damage and a Break-Fall Landing in UE5 Multiplayer](./2026-11-19-pseudo-coyote-time-fall-damage-break-fall), and the reaction system with stagger, knockback, down and launch is in [Hit Reactions, a Groggy Gauge and Break-Fall in UE5 GAS](./2026-11-17-pseudo-hit-reactions-groggy-break-fall). This post is about what changed after both were in play.

## Three landing numbers that drifted apart

The landing feedback list had several items, and two of them were the same bug seen twice. A damaging landing should always play the landing recovery and its impact, and a harmless landing should never play it; instead the clip sometimes played while the character slid. And after a long drop followed by a double jump to slow down, the body slid along the floor in a prone pose after landing.

The cause was that three separate numbers each answered "was that a hard landing?":

- fall damage started at `FallDamageMinHeight`, 500 cm,
- the landing recovery started at `FallRecoveryHeight`, 1000 cm,
- the animation blueprint's hard-landing pose used `HardLandingSpeedRatio`, 1.5 × the jump's Z velocity, which comes to roughly 3 m.

A landing could pass one check and fail another, so the pose, the recovery ability and the damage could disagree about the same landing.

I removed `FallRecoveryHeight` and `HardLandingSpeedRatio`. Fall damage, the landing recovery, the anim blueprint's hard landing and a new fall warning now all use the drop from the last apex against `FallDamageMinHeight`. The landing component's rule is one line:

```cpp
// Every landing that deals damage plays the recovery; a harmless one never does
bPendingRecovery = !bPendingLuckSaved && GetFallDamageFraction(FallHeight) > 0.f;
```

A landing saved by a Luck roll gets neither damage nor recovery, as before. The landing recovery ability also calls `StopMovementImmediately` when it starts, so the capsule cannot keep sliding under the recovery clip.

## Measuring the drop from the apex

The anim instance doesn't know where the jump started, but it knows the falling speed. The drop from the apex follows from the fastest downward speed since then, with `h = v² / 2g`:

```cpp
PeakFallSpeed = Velocity.Z >= 0.f ? 0.f : FMath::Max(PeakFallSpeed, -Velocity.Z);
bDangerFall = FMath::Square(PeakFallSpeed) / (2.f * Gravity) >= FallDamageMinHeight;
```

Any upward speed resets the peak, which marks a new apex. That is where the double-jump bug went away: a double jump in mid-fall gives upward speed, so the drop starts again from the second apex for every check. I decided that a double jump is allowed to cancel fall damage this way. Before, one system measured from the new apex and another didn't, and that mismatch was the prone slide.

## A fall warning that needs no RPC

Once one number defined a dangerous drop, the game could tell the player before landing. When the drop from the apex reaches the damage zone, the character switches to a danger pose: a short loop of five frames from a jump apex clip, played back and forth at half speed. On the falling player's own machine there is also a warning sound, a wind loop, a vignette and colour fringe that grow toward the ground, and controller rumble. All of it is cut when the character lands.

The warning is purely cosmetic, so I didn't replicate it. Every machine computes the same condition from the replicated movement. The pose plays on every machine through the main anim instance, and the screen effects, sound and rumble play only for the player who is falling. In a test, a 1200 cm drop showed the warning about 0.55 s before landing on both the host and a client, and the danger pose handed over to the landing recovery montage. At 700 cm the warning came about 0.2 s before landing. Drops of 300 and 450 cm showed no warning and no recovery.

A feedback round found one leftover: the warning sound kept playing after a medium-height landing. The warning one-shot is now attached to the player and faded out on landing.

## Camera shakes as data, played only on your own screen

The same pass added a camera shake per action, with landings in two tiers. Instead of each ability owning a shake class, a small struct holds a soft class reference and a scale, and an empty class means no shake:

- the weapon data asset has a light and a heavy hit shake for the attacker's screen,
- project settings have shakes per reaction type, for the dash, the break-fall, and a medium and a strong landing, split at `LandingStrongHeight` (1000 cm).

The struct's `PlayOn` only plays for a locally controlled player, so a shake triggered by the server's copy of an ability never reaches anyone else's camera. Ten shake Blueprints were added, all children of one camera shake class. The greatsword uses the light and heavy hit shakes; the pistols use the light one at 0.4 scale.

## A knockback that outlasted its push

The knockback had the same kind of problem from the other side. The push was a root motion movement of 300 cm over 0.25 s, but the hit react ability ended only when the knockback montage ended. The player's knockback clip is 1.25 s long, so for about a second after the push had stopped, the player stood in the clip and couldn't move. Enemy clips were shorter (0.83 s and 0.8 s), so it mostly showed on the player.

The fix was to end the reaction on the push:

```cpp
// StartKnockback
PlayReactionMontage(Config->KnockbackMontage, NAME_None, Settings->KnockbackMontagePlayRate);
...
Push->OnFinish.AddDynamic(this, &UPseudoGameplayAbility_HitReact::OnKnockbackPushFinished);

void UPseudoGameplayAbility_HitReact::OnKnockbackPushFinished()
{
	if (Reaction != EPseudoReaction::Knockback || !IsActive()) return;
	// Ending stops the montage with its blend out; each machine ends on its own push
	EndAbility(CurrentSpecHandle, CurrentActorInfo, CurrentActivationInfo, true, false);
}
```

Ending the ability stops the montage with its own blend-out of 0.25 s, so the clip doesn't snap away; the player already has control while it fades into locomotion.

I also doubled the distance to 600 cm. Doing that in 0.25 s looked too fast, so the push now takes 0.4 s. A new `KnockbackMontagePlayRate` of 1.5 decides how much of the clip is seen before the cut.

The ability is server-initiated, so the host, the owning client and the server's copy each run their own push task and each end on their own `OnFinish`, the same way a stagger ends on its own clip. Server-only termination only stops a client's end from reaching the server; the server ends its copy itself.

Measured on a listen server with one client: the host was pushed 620 cm and its reacting state ended at 0.436 s. For the client, the server copy moved 621 cm and ended at 0.412 s, and the client's own copy moved 621 cm and ended at 0.394 s. Its final position matched the server's within 0.1 cm. Mid-push it was up to 140 cm behind and then converged without snapping back. The host moved 269 cm in the 0.7 s after the end, with input working on the first frame.

## Checking your own landings and reactions

- **List every place that decides "hard landing"**: damage, recovery ability, anim blueprint pose, camera shake, sound. If they use different numbers or different measurements, make them read one setting.
- **Measure falls from the last apex**, and reset on any upward speed. `v² / 2g` from the peak downward speed works anywhere you have velocity, including the anim instance.
- **Stop the capsule when a landing recovery starts**, or the clip will play over a sliding body.
- **Keep cosmetic warnings local.** If every machine has the replicated movement, each can compute the condition itself, with screen effects only on the owning player.
- **Put camera shakes in data**, as a class plus a scale, and play them only for the locally controlled player.
- **End movement reactions on the movement task's finish**, not the montage end, and let the montage's blend-out carry the transition. Use the montage play rate to choose how much of the clip is seen.

Still to do: the same pass raised the default run and sprint speeds to 500 and 700, so the level metrics need a new gym measurement and the locomotion blend spaces may need their sample speeds moved. A warning about a missing `Fwd` section in the stagger montage still has to be checked. How the shakes feel and how the cut and blend-out look are left for playtesting.
