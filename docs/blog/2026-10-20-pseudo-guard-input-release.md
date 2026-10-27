---
title: "A Guard That Never Let Go: WaitInputRelease in UE 5.8"
description: "In PSEUDO, letting go of the guard button didn't end the guard. The Gameplay Ability System's WaitInputRelease task listens for a replicated input event that the ability system component no longer sends by itself, so the ability stayed active forever. The fix is a small ASC override, the same one Lyra uses."
date: 2026-10-20
publishAt: 2026-10-28
track: "Guard input release"
outline: deep
tags: [UE5, GAS, Input, Networking, Debugging]
---

# A Guard That Never Let Go: WaitInputRelease in UE 5.8

Guard in PSEUDO is a hold ability. Pressing the button starts the guard and the parry timing check at the same moment, holding keeps you guarding, and letting go ends it. The [Defense](/wiki/systems/defense) page has the design. The implementation is a Gameplay Ability that applies a `State.Guarding` tag, tells the server-side defense component that the character is guarding, and then waits for the button to be released.

During the same listen-server session that turned up [hits that only landed while the host was watching](./2026-10-20-pseudo-offscreen-enemy-hits), the "waits for the button to be released" part turned out not to work at all.

## Symptom

On the client, I tapped guard once during an enemy combo, then tapped it again on the next swing.

- The second press did nothing. `LogPseudoGuard` printed once, for the first tap, and never again.
- Every hit after that came back `Guarded`, for 2.4 damage instead of 8, even though I had released the button long before.

So the first guard was still active. Because the ability was still running, the second press couldn't activate a new one, and that meant no new parry window either. A defense system built around timing a fresh press on each swing was reduced to a permanent damage reduction after one tap.

The dash, which also goes through the ability system, didn't have this problem. That turned out to be a useful clue: the dash ends when its montage and root motion end. It never waits for input.

## What I checked

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The release never reaches the ability system | My input handler for ability release is bound to Enhanced Input's `ETriggerEvent::Completed`, and the ability system component (ASC) queues the release in `InputReleasedSpecHandles` | Ruled out: the ASC receives the release |
| 2 | The ASC doesn't pass the release on to the waiting task | Read the engine's `UAbilitySystemComponent::AbilitySpecInputReleased` (in `AbilitySystemComponent_Abilities.cpp`) | **Confirmed** |

The second check was a matter of reading the engine function. In 5.8 it sets `Spec.InputPressed = false` and calls the deprecated `UGameplayAbility::InputReleased` on the ability instance. That's all. Nothing in it calls `InvokeReplicatedEvent`.

## Root cause

It's easy to assume that `UAbilityTask_WaitInputPress` and `UAbilityTask_WaitInputRelease` listen to your input bindings. They don't. They know nothing about Enhanced Input.

What they do is register a callback on the ASC's **generic replicated events**, specifically `EAbilityGenericReplicatedEvent::InputPressed` and `InputReleased`, for their ability spec and the activation's prediction key. When that event fires for that spec, the task completes. Something has to fire it.

- Older engine versions fired these events from `AbilitySpecInputPressed` and `AbilitySpecInputReleased`, so the tasks worked out of the box.
- In current UE 5 the engine only does this when the ability has `bReplicateInputDirectly` set. That option sends every press and release to the server as its own RPC, and Epic's own comments discourage it. I don't use it.

So in my project nothing ever fired `InputReleased`. The chain from there:

1. `WaitInputRelease` never completed.
2. My guard ability calls `EndAbility` when that task completes, so `EndAbility` never ran.
3. The ability stayed active, and the character kept `State.Guarding`.
4. On the server, the defense component's `EndGuard` never ran, so its `bGuarding` flag stayed true, and every incoming hit resolved as a held guard.

## Fix

The fix is to have my ASC fire the events itself whenever input goes to an active ability. Lyra's ability system component does the same thing, which was reassuring: this isn't a hack around a bug so much as a step the engine now leaves to the project.

```cpp
void UPseudoAbilitySystemComponent::AbilitySpecInputReleased(FGameplayAbilitySpec& Spec)
{
	Super::AbilitySpecInputReleased(Spec);

	// WaitInputRelease listens for this generic event; the engine no longer sends it
	// unless bReplicateInputDirectly is set.
	if (Spec.IsActive())
	{
		const UGameplayAbility* Instance = Spec.GetPrimaryInstance();
		const FPredictionKey PredictionKey = Instance
			? Instance->GetCurrentActivationInfo().GetActivationPredictionKey()
			: FPredictionKey();

		InvokeReplicatedEvent(EAbilityGenericReplicatedEvent::InputReleased,
			Spec.Handle, PredictionKey);
	}
}
```

`AbilitySpecInputPressed` gets the same override with `InputPressed`.

`InvokeReplicatedEvent` is the right call here because it does two jobs:

1. **Locally**, it fires the event, so the client's copy of `WaitInputRelease` completes and the client's guard ends right away. That's the predicted part: the player sees the guard drop the moment they let go.
2. **On a client**, it also calls `ServerSetReplicatedEvent`, so the server's copy of the same ability gets the same event. The server's task completes, its guard ability ends, and `EndGuard` clears the flag that the hit resolution reads.

The activation prediction key ties the event to this particular activation, so a release can't be applied to a different activation of the same ability.

Because the override lives in the ASC rather than in the guard ability, it covers every ability that waits on input from now on. Charge attacks, aim, and any hold-to-cast skill will rely on the same two tasks.

## Verification

After a rebuild:

- Three guard taps on three consecutive enemy swings: each tap activated a new guard on both the client and the server, and each opened a fresh parry window.
- Holding guard for 1.5 s and for 3 s: hits during the hold came back `Guarded` (2.4), and the first hit right after the release did full damage (8).

That second test is the one that matters. It checks both edges of the hold, not just the start.

## What I took from it

**Test the release path of a hold ability, not just the press.** My first guard tests checked that pressing guard reduced damage. They passed. Nothing in them checked that the reduction stopped.

**When an engine task never fires, look at what feeds it.** I spent no time on my input bindings because the first check showed the release reached the ASC. The real question was what the task was listening to, and the answer was a generic ASC event, one layer away from where I'd been looking. Reading the engine function that was supposed to forward the event answered it in one step.

**The comparison case helped.** The dash worked and the guard didn't. Asking what the two did differently ("one waits on input, one doesn't") narrowed the search to the input tasks before I had read any engine code.
