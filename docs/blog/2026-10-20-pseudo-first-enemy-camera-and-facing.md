---
title: "Two Bugs from the First Enemy: A Jumpy Camera and a Grunt That Wouldn't Turn"
description: "When PSEUDO's first melee grunt went in, the camera jerked forward whenever anyone walked behind the player, and the grunt never turned to face its target. One was the spring arm treating every character as a wall; the other was an AI controller with tick turned off, the same mistake I'd made a week earlier with the player controller."
date: 2026-10-20
publishAt: 2026-10-28
track: "First enemy bugs"
outline: deep
tags: [UE5, AI, Camera, Collision, Debugging]
---

# Two Bugs from the First Enemy: A Jumpy Camera and a Grunt That Wouldn't Turn

The first enemy in PSEUDO is a melee grunt built on a shared AI framework: an AI controller that picks a target and sets focus on it, and an enemy character that turns toward where its controller wants to look. The first round of tests looked fine. Then I played it like a player instead of like a test, and two things were obviously wrong:

1. Whenever the grunt, the other player, or even the grunt's swords passed between my character and the camera, the camera jerked forward for a moment.
2. The grunt didn't look at me. It walked toward me and swung, but if it started facing the wrong way, it stayed facing the wrong way.

Both are one-line fixes. Both are worth a post because they're the kind of default that bites everyone once, and the second one bit me for the second time in a week.

## Bug 1: the camera jumps when someone walks behind you

### Symptom

In a listen-server session with one client, letting the grunt or the other player walk behind my character made the camera snap forward toward the character, then snap back once they'd passed. Only level geometry should ever pull the camera in.

### What I checked

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The spring arm's collision test is hitting characters | Player Blueprint defaults: the camera boom has its collision test on, probing the `Camera` channel with a 12 cm probe | Probe active |
| 2 | Characters block that channel | Capsule (`Pawn` profile) and mesh (`CharacterMesh` profile) on both the player and enemy Blueprints: response to `Camera` = **Block** | **Confirmed** |
| 3 | The grunt's swords are separate actors with their own collision | They're bones in the grunt's skeletal mesh | Ruled out: covered by the mesh's response |

### Root cause

`USpringArmComponent` sweeps a sphere from its pivot to where the camera wants to be, on its probe channel (`Camera` by default), and shortens the arm to the first blocking hit. That's what keeps the camera from clipping into walls.

The engine's stock `Pawn` and `CharacterMesh` collision profiles **block** the `Camera` channel. So every character counted as a wall, and so did anything skinned to a character's mesh, which is why the grunt's swords did it too. Walk something between the player and the camera, and the arm pulls in to sit in front of it.

This is easy to miss in early testing because, with only one player and no enemies, nothing ever walks behind you.

### Fix

In the shared character base class that both players and enemies inherit:

```cpp
APseudoCharacterBase::APseudoCharacterBase()
{
	// Only level geometry should pull the camera in, not other characters.
	GetCapsuleComponent()->SetCollisionResponseToChannel(ECC_Camera, ECR_Ignore);
	GetMesh()->SetCollisionResponseToChannel(ECC_Camera, ECR_Ignore);
}
```

Because it's a constructor change, Blueprints only pick it up after a full rebuild and an editor restart. Their defaults come from the native class defaults, and Live Coding doesn't refresh those.

### Verification

- Player and enemy Blueprint defaults: capsule and mesh now ignore `Camera`.
- I placed the grunt 250 cm behind the host, between the player and the camera, and let it walk in. The camera distance stayed at the full boom length, 400 cm, on every sample.
- Hit detection is unaffected. It sweeps `Pawn` objects and the target's mesh bodies directly; it never used the `Camera` channel.
- Walls still pull the camera in, because level geometry still blocks `Camera`.

Putting it in the base class means every future character class gets it for free. The remaining thing to watch is anything *attached* to a character with its own collision, like a shield or a prop. Those should ignore `Camera` too. The current weapon meshes have no collision at all, so they're fine.

## Bug 2: the grunt that wouldn't turn

### Symptom

The grunt didn't turn toward its target while approaching or attacking. The setup should have handled that:

- The AI controller calls `SetFocus(Target)` when it picks a target.
- The enemy character has `bUseControllerDesiredRotation = true` and `bOrientRotationToMovement = false`, with a rotation rate of 540°/s, so it turns smoothly toward wherever its controller is looking.

The earlier tests had passed only because the grunt spawned facing the player and walked straight at it, so it happened to be looking the right way the whole time.

### What I checked

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | Focus is never set | The target-finding code calls `SetFocus` and logs the target | Ruled out |
| 2 | The pawn ignores its controller's rotation | Enemy constructor: controller desired rotation on, orient-to-movement off, 540°/s | Ruled out |
| 3 | The controller's rotation never updates | Engine source: `AAIController::Tick` calls `UpdateControlRotation`, which is the only per-frame focus update. My AI controller's constructor had `PrimaryActorTick.bCanEverTick = false` | **Confirmed** |

### Root cause

`SetFocus` doesn't rotate anything by itself. It stores a focal point. Every frame, `AAIController::Tick` calls `UpdateControlRotation(DeltaTime)`, which turns the controller's control rotation toward that focal point. The pawn then turns toward the control rotation.

With tick turned off, that never happened. The control rotation stayed at whatever it was at spawn, and `bUseControllerDesiredRotation` faithfully turned the grunt toward that fixed direction forever.

### Fix

```cpp
APseudoAIController::APseudoAIController()
{
	// Must stay true: AAIController turns toward its focus in Tick.
	PrimaryActorTick.bCanEverTick = true;
}
```

Again a constructor change, so a full rebuild and restart.

### Verification

This time I tested the case that had been hiding the bug: I turned the grunt 90° away from its target on the server and let it go. It turned back to face the target in about 0.33 s, which is what 540°/s predicts for the angle it had to cover, and the samples on the server and the client matched within a frame.

## The second time in a week

A week earlier I lost an evening to [a player controller with tick turned off](./2026-10-13-pseudo-player-controller-tick-blocks-input): WASD did nothing because `APlayerController` processes input in its tick. This is the same class of bug in a different engine class.

The root is a habit I'd written into my class template: **turn actor tick off by default**, and turn it on only where needed. That's a good habit for my own actors. Most of them don't need to tick, and an actor that ticks for nothing costs CPU across every instance in the level. But it's wrong for engine base classes that do real work in `Tick`. `APlayerController` and `AAIController` are two of them, and nothing warns you when you turn their tick off. They just quietly stop doing part of their job.

So the rule is now explicit:

- Before turning off tick in a subclass, check whether the **parent's** `Tick` does anything. If it does, leave it on.
- Classes that need tick set it to `true` with a one-line comment saying why, so a later cleanup pass doesn't "fix" it back.
- `APlayerController` and `AAIController` are on the list of known exceptions. I'll add to it as I find more.

## What I'd test differently

Both bugs survived the first round of tests for the same reason: the tests were too tidy. Nobody walked behind the player, and the grunt always started facing the right way. My enemy test checklist now includes:

- Something passing between the player and the camera (another player, an enemy, an enemy's weapon).
- An enemy that starts turned away from its target.
- And, after a related bug found the same day, a fight the listen-server host's camera **can't see**. Off-screen characters skip some work by default, and server-side hit detection can't afford that. That one gets its own post.
