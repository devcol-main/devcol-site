---
title: "Switch Ammo, Press Fire, Nothing Happens: Three Bugs Behind One Report"
description: "After switching ammo on PSEUDO's dual pistols, a fire press sometimes did nothing. It turned out to be three separate problems: a stance gate that dropped presses silently, an ammo cycle that didn't count as combat input, and a fire ability that stayed active forever when its montage was cut during the blend-out."
date: 2026-11-04
publishAt: 2026-12-31
track: "Ammo switch lost presses"
outline: deep
tags: [UE5, GAS, Animation, Input, Debugging]
---

# Switch Ammo, Press Fire, Nothing Happens: Three Bugs Behind One Report

PSEUDO's dual pistols have one fire button and several ammo types. The E key (L1 on a gamepad) cycles to the next type, and holding the lock-on key opens an ammo wheel. The [Weapons](/wiki/systems/weapons) page has the design. Some ammo types also come with a stance: picking the Laser or the heavy machine gun (HMG) summons a big gun with an enter animation, and the elemental types (Fire, Ice, Poison) raise the pistols into a charge pose first.

The report came from a play session:

1. Basic ammo runs dry, I switch to another ammo, and that ammo **sometimes** doesn't fire.
2. Basic runs dry, I use another ammo for a while, switch back to basic once it has refilled, and basic sometimes doesn't fire.

"Sometimes" is the word that makes a bug expensive. I set up a repro run with a listen server, one client and injected input, so both machines pressed buttons at exact times. The run turned up two separate causes and one hang I couldn't explain at first, and the hang turned out to be the most interesting of the three.

## The symptom

- **Expected**: the first press after a switch fires the selected ammo.
- **Observed**: a press right after a switch did nothing, with no log line at all. After a longer wait, a left click either swung the greatsword or did nothing.

The ammo types involved, with their stance animations:

| Ammo | Stance enter | Stance exit |
|---|---|---|
| Basic | none | none |
| Shotgun | none | none |
| Laser, HMG | `AM_TB_Stance_Ult_Enter`, 1.1 s | `AM_TB_Stance_Ult_Exit`, 1.2 s |
| Fire, Ice, Poison | `AM_TB_Pistol_Charge`, 0.55 s | none (the next stance takes over) |

Basic ammo has a magazine of 6 in this build and refills over time, which is why the second report involves waiting.

## What I ruled out (and what I didn't)

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| A | The stance enter or exit swallows presses | Taps at 0.2, 0.6 and 1.0 s after each switch, on the host and the client | **Cause** |
| B | The weapon gets stowed during the wait | 13 s idle with no enemy nearby | **Cause** |
| C | The fire ability stays active and blocks new presses | Counted `Activated` against `Ended` in the ability system's verbose log | **Cause**, found in two steps (below) |
| D | My first fix for A works | Second run with the fix | It didn't: the buffered press expired before it was tried |

## Cause A: a gate that says no without saying anything

The stance design has a rule: no shot until the enter animation has finished. The client checks it in the fire ability's `CanActivateAbility`, which returns false while the ranged component's `IsStanceReady()` is false, that is, while an enter or exit montage is playing. The server has its own version of the check, so a modified client can't skip it.

The rule is fine. The problem was what happened to a press that arrived during that window. `CanActivateAbility` returned false, nothing was logged, and the press was gone. My ability system component does keep a short input buffer for blocked activations, but it's 0.15 s, meant for things like a press during the last frames of a dash. The stance windows are much longer: about 1.5 s of dead time from Laser to Fire (exit, then enter), 1.2 s from HMG to Basic.

So a player who switched and pressed right away lost the press, and a player who waited a beat didn't. That is exactly what "sometimes" looks like from the outside.

## Cause B: choosing ammo wasn't "fighting"

PSEUDO stows the weapon on its own after a fight: once combat has ended and there has been no combat input for 3 seconds, the weapon goes away. An attack press while stowed is a draw attack.

The ammo cycle is a native input binding, outside the ability input path, and it didn't update `LastCombatInputTime`. So in the second scenario, a player standing still and cycling ammo while basic refilled was, as far as the stow logic knew, idle. The pistols got put away, and the next left click drew the greatsword and swung it. It's the same auto stow that turned up a day earlier in [the pistols that wouldn't fire after a swap](./2026-11-03-pseudo-pistols-wont-fire-after-swap), reached by a different input.

## Cause C: a fire ability that never ended

This one showed up in the first run as a hang: after a while neither player could fire at all until I restarted PIE. No blocking tags were on either character. The verbose ability system log had the clue: 30 `Activated` lines for the fire ability against 27 `Ended`. Some activations never ended, and while the ability was still active, a new press couldn't start a new one.

I couldn't see why from that run, so I added a safety net first, then a log to go with it. In the fire ability's `InputPressed`, a press on a fire that is active, locally controlled, not charging and has no montage playing now logs a warning with the ability's state and ends the ability, so the next press fires. In the second run the hang reproduced 2 times out of 10 per machine, and the warning said:

```
fire stuck (montage None not playing, task set, round montage AM_TB_Pistol_Fire_Heavy, ammo Ammo.Shotgun, round 1, shot 1)
```

So: a Shotgun round, its montage gone, the montage task still set. And every time, the ammo cycle had come 0.82 to 0.98 s after a Shotgun tap. A Shotgun round is 1.0 s long, and its montage starts blending out 0.25 s before the end. The switch was landing inside the blend-out.

That pointed at the engine's `UAbilityTask_PlayMontageAndWait`. If the montage it's waiting on is interrupted **after its blend-out has started**, the task only broadcasts `OnInterrupted` when `bAllowInterruptAfterBlendOut` is true. Otherwise it reports nothing more. My fire round listened for `OnCompleted` and `OnInterrupted` only; it waits for `OnCompleted` rather than the blend-out on purpose, because the blend-out starts early and would shorten the fire cadence.

The chain:

1. Shotgun round plays, enters its blend-out.
2. The ammo switch plays the new stance's enter montage straight on the anim instance, which cuts the blending-out round.
3. The task sees an interrupt after blend-out, `bAllowInterruptAfterBlendOut` is false, so neither `Completed` nor `Interrupted` is broadcast.
4. The fire ability waits forever, and no press can start a new one.

## Finding D: the first fix for A didn't fire

The first fix for A gave the fire ability a longer buffer while the stance isn't ready. In the second run it failed on both machines: presses during the stance window still didn't fire.

The buffer loop in `ProcessAbilityInput` checked each entry's expiry **before** retrying it. The ability's buffer time depends on the stance: 2 s while the stance isn't ready, 0.15 s otherwise. On the frame the stance became ready, the buffer time dropped back to 0.15 s, so a press buffered a second earlier counted as expired and was dropped untried. The window closed exactly when the press could finally have fired.

## The fixes

**A**: a press during the stance window is kept until the stance is ready, then fires once. If the button is still held, full auto continues from there. `GetActivationBufferTime` on my base ability is now virtual, and the fire ability returns a longer `StanceBufferTime` only while the stance isn't ready, so a press during a dash or a weapon swap still gets the normal short buffer:

```cpp
float UPseudoGameplayAbility_RangedFire::GetActivationBufferTime(const FGameplayAbilityActorInfo* ActorInfo) const
{
	// Only the stance wait gets the long buffer: a press during a dash / swap keeps the short one
	const UPseudoRangedComponent* Ranged = ActorInfo ? UPseudoRangedComponent::Find(ActorInfo->AvatarActor.Get()) : nullptr;
	if (Ranged && Ranged->GetBasicAmmo() && !Ranged->IsStanceReady())
	{
		return FMath::Max(Super::GetActivationBufferTime(ActorInfo), StanceBufferTime);
	}
	return Super::GetActivationBufferTime(ActorInfo);
}
```

And the buffer loop now tries first and expires after:

```cpp
// Try first, expire after: a buffer time that shrinks when the block lifts (the ranged stance wait)
// must still get its one try in that frame
if (!Ability || TryActivateAbility(BufferedActivations[Index].Handle)
	|| Now - BufferedActivations[Index].Time > Ability->GetActivationBufferTime(AbilityActorInfo.Get()))
{
	BufferedActivations.RemoveAtSwap(Index);
}
```

**B**: the ammo cycle and the ammo wheel (press and hold) now set `LastCombatInputTime`. Separately, a change in the same area (#200) makes an attack press while stowed draw the last drawn weapon without attacking, which removes the "left click swings the greatsword" part of the report.

**C**: the round's montage task is created with `bAllowInterruptAfterBlendOut = true`, so a cut during the blend-out reports `Interrupted` and the ability ends normally. I kept the safety net in `InputPressed` as well. It logs a warning, so if it ever fires again I'll know.

## Checking it

The second run (with the first fix) passed B: cycling ammo every 2 s for 10 s didn't stow, and the stow came 3.06 and 3.2 s after the last press. It failed A (finding D), and C reproduced 2 out of 10 times per machine, with the safety net recovering after one press.

The third run, with try-before-expiry and `bAllowInterruptAfterBlendOut`, host and client, all passed:

- Basic to HMG, tap 0.2 s after the switch: one activation 0.86 s after the switch, one HMG shot.
- HMG to Basic, tap 0.2 s after: one activation 0.96 s after, one basic round.
- Laser to Fire, tap 0.3 s after: one Fire shot after the stance enter.
- The hang sequence 10 times, plus a Basic variant 10 times on the host: 0 `fire stuck` warnings, every activation ended, every basic tap fired. (Laser taps are early releases of a charge, which don't fire by design.)
- Regressions: holding Basic for 3 s fired 12 to 14 bullets in one activation, holding HMG for 3 s fired 30 to 31 shots, and a left click after a stow drew the pistols with 0 fire activations.

One harness note: cheat commands (giving ammo, for example) sent close to a press can cause hangs of their own, so I kept them well away from the presses.

## What I took from it

**A gate that will open soon should wait or speak.** `CanActivateAbility` returning false is the right answer during a stance enter, but returning false silently turns "not yet" into "never". Either buffer the press until the gate opens, or log it. The silent version reads as "sometimes doesn't fire", which is the hardest kind of report to act on.

**Every input that means "I'm fighting" has to reach the stow clock.** The ability inputs updated it. A native binding outside that path didn't, and nobody notices that until someone stands still and fiddles with their ammo.

**A montage task waiting for Completed or Interrupted can wait forever.** Anything that plays a montage directly on the anim instance (here, a stance enter) can cut an ability's montage during its blend-out, and by default the task doesn't report that. If the ability only ends on those two callbacks, set `bAllowInterruptAfterBlendOut`.

**Count starts and ends.** `Activated` 30, `Ended` 27 in the verbose log was the first hard evidence that an ability was stuck, before I knew which one or why. It's a cheap check for any "input stops working" bug.

The safety net I kept for C had a problem of its own, which a later test found: [it mistook a healthy round's blend-out for a stuck fire](./2026-11-04-pseudo-fire-blend-out-false-stuck). And the stance switch that took 1.5 s here also looked wrong, which got its own fix: [the gun dipped on every ammo switch](./2026-11-04-pseudo-ammo-switch-gun-dip).
