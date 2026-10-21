---
title: "The Server Never Swapped: Ending a Predicted Ability Too Early"
description: "A locally predicted weapon-swap ability in UE5 GAS swapped on the client and never on the server. The client's normal end was replicated and cut the server's copy before it reached its montage notify. Plus a cheat that called itself 2317 times in one frame, and why editor Python is a bad way to drive a PIE client."
date: 2026-10-19
publishAt: 2026-10-28
track: "Predicted weapon swap"
outline: deep
tags: [UE5, GAS, Networking, C++, Debugging]
---

# The Server Never Swapped: Ending a Predicted Ability Too Early

PSEUDO has two weapon slots, and swapping between them is a Gameplay Ability with a sheath or draw animation. The ability is **locally predicted**: the client starts the animation immediately so the key feels instant, and the server runs its own copy. The actual slot change happens on the server, at an animation notify partway through the montage, and replicates out from there.

Sheathing worked. Drawing, from the client player, did not: the client logged its swap, the server never did, and every pawn kept the pistols. This post is about why, which comes down to who gets to end a predicted ability. At the end there's a related story from two days earlier, about a cheat command that called itself 2317 times in one frame, because both bugs share a lesson about how I was testing.

## The setup

- `UPseudoGameplayAbility_WeaponSwap`, net execution policy **LocalPredicted**.
- It plays a montage. When the montage's `Event.Weapon.Swap` notify fires, the server switches the active slot.
- Sheath montage: notify at **0.40 s**. Draw montage: notify at **1.27 s** of **1.67 s**, with a 0.25 s blend-out.
- Repro: play in editor as a listen server with two players, in floating windows (so both run in the background at low frame rates), client presses swap while pistols are drawn.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The notify never fires | Inspected the notify instances on the montages | **Confirmed, first bug**: the event tag on the placed instances was empty |
| 2 | The server copy never activates | Added activate and end logs on both sides | Ruled out: it activates, then ends with `swapped=0` right after the client ends |
| 3 | The client's end cuts the server short | Compared end time vs notify time on the server's schedule | **Confirmed, root cause** |
| 4 | An interrupt reaches the server as a cancel | Read the engine source for replicated end vs cancel | **Confirmed, second issue**: it doesn't |

### The first bug, briefly

The notify's event tag had been set on the notify class's defaults by a script. The notify instances already placed on the montages didn't pick that up; each placed instance keeps its own values. Once I set the tag on the instances, the client logged its swap. The server still didn't.

That's a small trap worth knowing: if you change a notify's defaults after placing it on montages, check the placed instances, not the class.

## The real problem: two copies on two clocks

With logs on both sides, the sequence on a client draw was:

```
[client] activate  AM_TB_Greatsword_Draw
[client] swap      (at its notify, 1.27 s)
[client] end       (at blend-out, 1.67 − 0.25 = 1.42 s)
[server] activate  AM_TB_Greatsword_Draw   (a few frames after the client)
[server] end (cancelled=0, swapped=0)      (right after the client's end arrives)
```

A predicted ability runs twice: once on the client, starting immediately, and once on the server, starting when the activation arrives. Both play the same montage, offset by that latency.

When the client's montage finished, it called `EndAbility` with replication on. That sends `ServerEndAbility`, and the server ends its copy **on the client's schedule**. The client ends at 1.42 s of its montage. The server's montage started later, so when that end arrives, the server is earlier in the clip. For the swap to happen, the server needs to have reached 1.27 s by then.

The margin is 1.42 − 1.27 = 0.15 s, minus the activation latency. In two background editor windows running at low frame rates, the latency ate the whole margin, and the server's copy ended before its notify every time. The sheath montage's notify at 0.40 s had plenty of margin, which is why sheathing worked and made this look like a draw-specific bug.

**The general rule:** for a predicted ability whose authoritative action happens at a montage notify, replicating the client's normal end makes the server end on the client's timeline. Any notify later than "client end minus latency" can be skipped on the server. Lag makes it worse, so this would have shown up for real players with real ping, not just in my test windows.

## The second issue: an interrupt that looks like a finish

While reading the engine code for this, I found a related problem. When the montage is interrupted (say, a hit reaction cuts the draw), I was calling `EndAbility(..., bWasCancelled = true)` with replication. It looks like it sends a cancel. It doesn't.

In `UGameplayAbility`, ending with replication sends `ServerEndAbility` whether or not `bWasCancelled` is set. Only `CancelAbility` goes through `ReplicateEndOrCancelAbility(..., true)` and sends `ServerCancelAbility`. So the server couldn't tell "the client was interrupted" from "the client finished," which matters as soon as anything else in the game listens for cancellation.

## The fix

In the swap ability (simplified):

```cpp
void UPseudoGameplayAbility_WeaponSwap::OnMontageFinished()
{
	// Each side ends on its own montage. Only the server replicates its end,
	// so the server copy always reaches its own swap notify.
	const bool bReplicateEnd = HasAuthority(&CurrentActivationInfo);
	EndAbility(CurrentSpecHandle, CurrentActorInfo, CurrentActivationInfo, bReplicateEnd, false);
}

void UPseudoGameplayAbility_WeaponSwap::OnMontageAborted()
{
	// An interrupt must reach the server as a cancel, not as a normal end.
	CancelAbility(CurrentSpecHandle, CurrentActorInfo, CurrentActivationInfo, true);
}
```

Two more decisions came out of testing:

- A montage that has no swap notify still swaps at its end, with a warning in the log, so a missing notify is loud rather than silent.
- I tried an end-of-montage "safety swap" for the server in case it ever missed the notify. I removed it: it fired on ends that were really interrupts and swapped weapons the player had been knocked out of swapping.

## Verification

Listen server plus one client, inputs injected into the client:

- **Client sheath and draw:** the server logs its swap at its own notify, after the client has already ended. All pawns agree.
- **Host sheath:** the client's view of the host plays the sheath montage.
- **Interrupt on the server copy:** stopped at 0.88 s of the draw, before the 1.27 s notify: `[server] end (cancelled=1, swapped=0)`, pistols kept on both machines. That's the correct result for an interrupted draw.

One testing detail cost me a few runs: injected inputs closer together than a frame merge into one held press at background frame rates. I space them at least 0.3 s apart now.

## Two days earlier: a cheat that called itself 2317 times

Notice that I tested the interrupt on the **server's** copy, not the client's. That's because of an earlier bug.

On 10-17 I was testing animation layers with a cheat, `PseudoAnimLayer Weapon.Melee.Greatsword`, which sets a player's current weapon. To drive the test, I ran it from editor Python against the client world's player controller. The editor crashed with a stack overflow. The log ended with thousands of identical lines in a single frame: the command had executed 2317 times.

The cheat's client path looked reasonable:

```
cheat on a non-authority controller → PC->ServerCheat(command)
ServerCheat_Implementation         → ConsoleCommand(command) → the same cheat
```

On a real client, `ServerCheat` is an RPC: it goes to the server, and the server's copy of the controller has authority, so the cheat takes the server path and stops. But when I drove it from editor Python, the RPC **ran locally**. A local `ServerCheat_Implementation` on a non-authority controller runs the cheat, which sees no authority, which calls `ServerCheat`, which runs locally again. An infinite loop with no network round trip to break it, all in one frame.

Why did the RPC run locally? My best explanation is that a call from the editor tick happens outside the client's play-in-editor context, so the RPC's call space resolves as local. I haven't traced it through the engine, so treat that as a suspicion. A later test of a server-initiated ability from editor Python showed the same pattern: the client-side RPC ran locally and the client never activated.

The fix is a guard that makes a misrouted call harmless (simplified):

```cpp
void APseudoPlayerController::ServerCheat_Implementation(const FString& Command)
{
	// A misrouted local call would re-enter the client branch of the cheat and loop forever.
	if (!HasAuthority())
	{
		return;
	}
	ConsoleCommand(Command);
}
```

After the guard, the same repro runs the command once and returns. No crash, but also no effect, because the call never reaches the server. The workaround for that test was to run the cheat on the server world, once per player controller, and let the weapon replicate. All four pawns (two server, two client copies) then had the greatsword.

## What I took away

- **Predicted abilities with a server action at a notify:** the client must not replicate its normal end. Each side ends on its own montage; only the server's end is replicated.
- **Interrupts go through `CancelAbility`.** `EndAbility` with `bWasCancelled = true` still reaches the server as an end.
- **Any server RPC whose implementation can re-enter the client path needs an authority guard.** It costs one `if`, and it turns an editor crash into a no-op.
- **Don't drive a play-in-editor client from editor Python.** Client-side RPCs sent that way may never leave the client. Use the client window's own console, or trigger the behavior from the server copy, or build an in-game trigger. Now that hit reactions exist, they're the natural way to interrupt a swap for testing.
- **Test with lag, or at least with background frame rates.** The draw bug only appeared because two editor windows were running slowly. A test that always runs at 120 fps on one machine would have hidden a bug that real ping exposes.
