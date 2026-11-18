---
title: "Witch Time in UE5 Without Slowing the Player: a Time Dilation Stack, CustomTimeDilation, Hitstop and a Predicted Hit Cue"
description: "How I built combat feel for a UE5 action game: a world subsystem that stacks SetTimeDilation requests so the slowest wins, a personal slow-motion that exempts one actor through CustomTimeDilation, camera blends and cooldowns that run on real time or world time on purpose, per-attack hitstop, lock-on with soft target assist, and a locally predicted hit cue that the server copy skips on the attacker's machine."
date: 2026-11-16
workedOn: 2026-10-20
publishAt: 2026-11-16
track: "Lock-on and feel"
category: "Build Logs"
sidebar: "Time Dilation and Hitstop"
image: /blog/pseudo-witch-time-c.jpg
outline: deep
tags: [UE5, GAS, Camera, Combat, Multiplayer, C++]
---

# Witch Time in UE5 Without Slowing the Player: a Time Dilation Stack, CustomTimeDilation, Hitstop and a Predicted Hit Cue

This build log is about the pieces that make PSEUDO's combat feel responsive: slow motion after a perfect dodge, a camera that changes with the situation, lock-on, a short freeze on hit, and the hit effect showing up on the attacker's screen without waiting for the server. If you only want the slow motion: route every time dilation request through one subsystem that keeps a list and applies the slowest, and exempt the player by setting their `CustomTimeDilation` to the shared slowdown divided by the world slowdown. Then decide for every timer whether it should run on world time or real time, because both are correct in different places.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-witch-time-c.jpg" alt="The slowest time dilation request wins, and the player is exempted through CustomTimeDilation." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-witch-time-c-dark.jpg" alt="The slowest time dilation request wins, and the player is exempted through CustomTimeDilation." loading="lazy">
</figure>

The camera values and mode rules are documented on the wiki's [Camera](/wiki/pseudo/systems/camera) page, and the lock-on controls on [Controls](/wiki/pseudo/systems/controls#lock-on). This post is about the engine side.

## A stack of slow-motion requests

Slow motion can come from more than one place: a perfect dodge now, a dice result later. If each of them sets the world's time dilation directly, the second one to finish puts the world back to normal speed while the first should still be running.

So nothing calls `SetTimeDilation` except `UPseudoTimeDilationSubsystem`, a tickable world subsystem that runs on the server. Callers push a request and get a handle back:

- `PushShared(Dilation, Reason, Duration)` slows everyone.
- `PushPersonal(Exempt, Dilation, Reason, Duration)` slows the world but not one actor.
- `Pop(Handle)` ends one request, `PopAll` ends all of them.

The slowest active request wins. When one ends, the subsystem recomputes the slowest of the rest and applies that, so overlapping requests end in the right order without the callers knowing about each other. The value is applied through `WorldSettings->SetTimeDilation`, which the engine already replicates, so clients follow without any code of mine. Durations are measured in real time with `GetRealTimeSeconds`; a 2 second slow motion measured in world time would itself be slowed down and last much longer.

## Exempting the player from their own slow motion

Witch time slows the enemies after a perfect dodge while the player keeps moving at full speed. The world can only have one time dilation, so the player has to be scaled back up. Every actor has `CustomTimeDilation`, which multiplies on top of the world's. For the exempt actor the subsystem sets:

```
CustomTimeDilation = sharedSlowest / worldSlowest
```

With only a personal request at 0.3, the player gets 1 / 0.3 = ×3.33 and moves at normal speed. If a shared 0.5 is also active (everyone slowed, including the player), the player gets 0.5 / 0.3 = ×1.67, so they end up at the shared speed rather than at full speed.

A personal slow motion can't work in multiplayer: one player's dodge would slow the other players' enemies, which are also their world. So the subsystem ignores personal requests when the game state has more than one player and logs that it did. I then lost time during my own test because of that rule: a test run had saved the editor's play settings with two players, and the slow motion "didn't work". With one player it worked.

Wiring it up was one call: when an enemy attack ability's trace finds that the defender made a perfect dodge, it pushes a personal request for the defender.

## Real time or world time, decided per timer

With the world slowed, every timer in the game picks a side, and I made the choice per system:

- **Camera blends run on real time** (`DeltaRealTimeSeconds`). A 0.3 s blend to the sprint camera took 0.27 s of real time during a 0.3 slow motion. On world time it would have taken a full second, and the camera would feel stuck.
- **Camera collision runs on real time** too. I subclassed the spring arm and overrode `UpdateDesiredArmLocation` to use the real delta.
- **The slow motion duration runs on real time**, as above.
- **Ability cooldowns stay on world time.** A dash cooldown of 0.6 s took 2.01 s of real time under 0.3. That's intended: slow motion shouldn't let you dash three times as often.

Player actions are also timed with montages and anim notifies rather than with timers, so world time dilation doesn't slow the player through them.

## Camera modes and a spring arm that pulls in early

The camera mode component checks a list of rules from the top: owned gameplay tag → camera mode data asset (`State.LockedOn` → LockOn, `State.Sprinting` → Sprint, `State.InCombat` → Combat, otherwise Idle). A mode holds arm length, offset, FOV, lag and blend time. A blend starts from the values currently on screen, not from the previous mode's targets, so changing modes in the middle of a blend doesn't jump.

The spring arm subclass also changes how it reacts to walls. It pulls in instantly and eases back out at 3 arm lengths per second. Three extra feeler traces (yaw ±16° with weight 0.5, pitch +10° with weight 0.3) start pulling the camera in a little before the main probe touches the wall. In the test, the arm went from 283 to 74 cm within 0.05 s against a wall, and from 119 back to 283 cm over 0.4 s when the wall was gone.

When the camera got closer than 50 cm to the capsule, the first version hid the local player's mesh and weapons for the owner only (`SetOwnerNoSee`). That was later replaced by a dither fade.

## Turning to face the character's movement, not the camera

Testing lock-on turned up an older problem. The player Blueprint still had the engine default `bUseControllerRotationYaw = true`, so the character always faced the camera, and it overwrote every turn toward a target. I switched to orient-to-movement in the character's constructor: `bUseControllerRotationYaw = false`, `bOrientRotationToMovement = true`, at 720° per second. While locked on, the character still walks where the stick points and only turns to the target when an attack starts.

## Lock-on and the soft target

`UPseudoLockOnComponent` is a replicated component on the player. Candidates are living enemies within a radius that are visible from the eyes, tested against static and dynamic world geometry only. A lock is dropped when the target dies (then it moves to the next target near the camera direction), when it gets beyond 1.2 times the radius, or when it has been out of sight for 1.5 s.

Locking turns the camera to the target over a short acquire time. After that the assist only pulls the yaw when the target is more than 25° off center, and it stops for 0.5 s after any look input, so the player can still look around. The client asks the server to set the target (`ServerSetLockTarget`, which checks for a living enemy in range), and the target replicates to everyone except the owner.

At the start of every attack, each machine running the attack turns the character toward the lock target. Without a lock it uses a soft target: the nearest living enemy within 4 m and ±60° of the facing.

The input rule in this version judged a tap on release (release within 0.3 s = lock or switch, held 0.4 s = release). That turned out to be the wrong place to decide, and I later moved it to the press: [A Lock-On That Waited for the Release](./2026-11-01-pseudo-lock-on-click-on-press).

## Hitstop on both sides of a hit

Hitstop is the freeze of a few hundredths of a second when a hit lands. `StartHitstop(RealDuration, bVictim)` runs on the core ticker, in real time:

- the attacker's active montage gets play rate 0, and the rate is restored afterwards only if the same montage is still playing at rate 0
- the victim gets `GlobalAnimRateScale` 0 and a small mesh shake

A second hit extends a running hitstop. Each attack in the combo data has a hitstop tier (None, Light, Heavy). The damage effect carries the tier as a source tag, and the hit cue reads it from the aggregated source tags. In the combo it happens once per attack: locally when the attacker detects the hit, and on the server's copy of a remote client's attack when the server validates it.

## A hit cue that is predicted, and skipped once

The hit effect should show up on the attacker's screen at the moment of contact, not after a round trip. So the attacker plays the cue locally when it detects the hit, with `ExecuteGameplayCue_NonReplicated` and a source tag `Feedback.Predicted`. The damage effect applied on the server then plays the same cue on every machine, including the attacker's, where it would play a second time.

I expected GAS's prediction keys to remove that duplicate, but they don't here. The damage is a gameplay effect applied to the target, and target effects clear the prediction key (`ShouldPredictTargetGameplayEffects`). So the cue does the check itself. A cue from the server is skipped when the attacker's pawn is player controlled and locally controlled on this machine and the cue doesn't carry `Feedback.Predicted`. One detail cost some time: the attacker has to come from `Parameters.GetEffectCauser()`. For cues from effects, the causer is in the effect context; the plain field on the parameters is empty.

The result in the test was one cue per machine per hit: the predicted one plus a logged skip on the attacker's machine, and the server's cue everywhere else. This was also when I found that the hit cue had never been registered at all: [The Hit Cue That Was Never Registered](./2026-10-20-pseudo-hit-cue-never-plays).

## Checking the same things in your project

- Search for every call to `SetTimeDilation`. If more than one system calls it, put a stack in front of it.
- For a slow motion that spares the player, compute the player's `CustomTimeDilation` as a ratio of the shared and world values, and disable it with more than one player.
- For each timer that matters (camera blends, durations, cooldowns, UI), write down whether it should follow world time or real time, then test under slow motion.
- If your characters face the camera and you didn't intend that, check `bUseControllerRotationYaw` on the Blueprint, not only in C++.
- If a predicted cue plays twice on the attacker, don't count on prediction keys for effects applied to a target; mark the local cue and skip the server one on the locally controlled attacker.

## How it was tested, and what's still open

All eight criteria passed in play-in-editor, partly as one player and partly as a listen server with a client: the dilation stack and personal ratios, a perfect dodge giving 0.3 for 2.00 s of real time at ×3.33 for the player, the real-time and world-time checks above, the camera modes and wall pull-in, locking, switching, releasing and the out-of-sight timeout, a client's lock and attack facing followed by the server, and the cue and hitstop counts per machine. The finisher's hitstop was 0.12 s.

My own play after that changed a few things. The lock-on switch felt abrupt, so the acquire turn now eases in and out and takes 0.35 s instead of 0.25 s, and the pitch only moves enough to bring the target within ±12°. Fast switching between enemies still didn't keep up; the release-based tap window was one of the suspects, and the input was later moved to the press. The hitstop (0.06 / 0.12 s) was too weak to notice and was left for a polish pass with camera shake, effects and sound. Strafe locomotion while locked on, effects for a personal slow motion in multiplayer, and the sprint camera mode (which waited for a sprint ability to set its tag) were left for later.
