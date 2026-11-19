---
title: "Tap to Dodge, Hold to Sprint on One Key in UE5: a C++ Tap/Hold Judge on Enhanced Input, Real-Time Thresholds and a Dash on Release"
description: "How I split one Enhanced Input action into a dodge on tap and a sprint on hold for a UE5 GAS listen-server game: the judge in C++ instead of Tap and Hold triggers, a threshold read from project settings in real time so time dilation can't stretch it, a dash fired on release that kept the server's perfect-dodge timing correct for free, sprint cancels, an L3 alternative and remappable key names."
date: 2026-11-20
workedOn: 2026-10-22
publishAt: 2026-11-20
track: "Dodge and sprint input"
category: "Build Logs"
sidebar: "Tap Dodge, Hold Sprint"
image: /blog/pseudo-tap-hold-c.jpg
outline: deep
tags: [UE5, Enhanced Input, GAS, Movement, Multiplayer]
---

# Tap to Dodge, Hold to Sprint on One Key in UE5: a C++ Tap/Hold Judge on Enhanced Input, Real-Time Thresholds and a Dash on Release

PSEUDO uses the Souls-style dodge key: tap Shift (or ◯ on a pad) to dash, hold it to sprint. Before this build, every sprint started with a dash. The approach that worked: one input action with no trigger, a small judge in C++ that decides on release or when the hold threshold passes, the threshold measured in real time so slow motion can't stretch it, and the dash fired on release. That last part also kept the server's perfect-dodge timing right without any change to it. If you are putting two actions on one key, this covers the trade-offs I hit.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-tap-hold-c.jpg" alt="Release before 0.2 s dashes, holding past it sprints, judged in real time." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-tap-hold-c-dark.jpg" alt="Release before 0.2 s dashes, holding past it sprints, judged in real time." loading="lazy">
</figure>

## The behaviour I wanted

- Shift or ◯ **tap**: dash, fired when the key is released.
- **Hold**: sprint, with no dash. The threshold is a project setting, 0.2 s by default, so a settings screen can expose it later.
- The sprint ends on release, and on any attack, aimed shot, guard, dice roll, dash or hit reaction.
- On a gamepad, **L3** is a second sprint button that sprints at once, with no threshold.
- Both keys can be remapped by name, and run and sprint speeds live in project settings (360 and 600 cm/s).

The [controls page](/wiki/pseudo/systems/controls) lists the result next to the other shared-button rules.

## Why one action and a C++ judge, not Tap and Hold triggers

Enhanced Input can do this with two actions on the same key, one with a Tap trigger and one with a Hold trigger. I chose one action and judged it in code, for three reasons:

1. **Remapping.** With one action, the player remaps one key name ("Dodge") and both behaviours follow. With two actions on Shift, a remap screen has to move two names together.
2. **The threshold comes from settings at run time.** A Tap or Hold trigger stores its time in the asset. `UInputTriggerHold` is `final` and `UInputTriggerTimedBase` is `MinimalAPI`, so a trigger subclass that reads project settings would be fragile across modules.
3. **Consistency.** The dice key already does tap versus hold in C++ the same way.

`IA_Dash` became a native action in the input config with no trigger in the asset, so it uses the implicit Down trigger: Started on press, Triggered every frame while held, Completed on release. Three handlers on the player character do the rest:

- **Started** stores the press time.
- **Triggered**: once the key has been held for at least `DodgeTapThreshold`, it presses the Sprint input tag. A flag makes sure that happens once per press.
- **Completed**: if sprint was sent, it releases the Sprint input tag. If not, it presses and releases the Dash input tag in the same frame.

A release before the threshold always dashes, even if that frame crosses the threshold, so there is never a frame where neither happens. Epic's [Enhanced Input page](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine) covers the trigger states these handlers rely on.

## Real time, so witch time doesn't turn a tap into a hold

PSEUDO slows world time for effects like witch time ([how that is built](./2026-11-16-pseudo-time-dilation-lock-on-hitstop)). If the threshold were measured in world time, a quick tap during slow motion would count as a hold. So the press time is taken with `FPlatformTime::Seconds`, which is real time and unaffected by time dilation.

## A dash on release kept the dodge judge correct

This was the part I expected to need work, and it needed none. PSEUDO's server judges perfect dodges by comparing when the dash started with when the enemy's hit landed ([the server-judged parry and dodge build](./2026-11-17-pseudo-server-judged-parry-dodge)). The dash start is stamped with the server world time when the defense ability activates.

Because the dash ability now activates in the release frame, the stamp is the release time automatically. The server's grace clamp is unchanged. A dash that is blocked at the release (during a combo cancel window or a hit frame) still goes through the same input buffer as before.

The test confirmed it. A client tap held for 0.08 s, timed off a minion's attack, logged the dash in the release frame and the hit 0.042 s later, which is a perfect dodge. Measured from the press instead, it would have been 0.122 s, past the 0.12 s perfect-dodge window. Every dash start in the tests was the release plus one frame.

The trade-off is felt in play: the dash now comes 0.0 to 0.2 s later than before, at release. That is a feel question for playtesting (0.15 and 0.25 are the next values to try).

## Sprint stays the same ability

Sprint was already a gameplay ability plus an effect, started through a `NetworkSyncPoint` so client and server apply it together. This build moved it from its own key to the Sprint input tag. I kept the path that waits for the dashing state to end, for the case where a sprint starts while a dash from an earlier tap is still running.

To end the sprint on a dash or a hit reaction, those two abilities now cancel abilities with the sprint ability's tag (`CancelAbilitiesWithTag`). Melee, ranged fire, guard and the dice already did. The base ability already blocks activation while the character is reacting.

Holding Shift through an attack does not restart the sprint afterwards; the attack cancels it and the key has to be pressed again. I didn't want a re-press loop fighting the combo's movement lock.

## L3, and keys the player can remap

The pad's L3 drives a new `IA_Sprint` action on the same Sprint input tag: press and hold to sprint at once, release to run. A click-to-toggle version is a feel decision for later.

For remapping, both actions have Player Mappable Key Settings in the asset: `IA_Dash` is named `Dodge` with the display name "Dodge (tap) / Sprint (hold)" in the Movement category, and `IA_Sprint` is `SprintAlt`. The mappings inherit those settings from the action. I checked the 5.8.3 source for the property names (`UInputAction::PlayerMappableKeySettings`, and `Name`, `DisplayName` and `DisplayCategory` on `UPlayerMappableKeySettings`) before writing them from a script. Turning on Enhanced Input's user settings and building the remap screen came later.

## Test results

Listen server plus one client:

| Check | Result |
|---|---|
| Host tap (0.10 s) | Dashing at 0.63 s for a release at 0.60, no sprint |
| Host hold | Sprinting 0.25 s after the press at 600 cm/s, never dashing; ends 0.03 s after release |
| Client hold | Sprint starts at 0.73 s locally and 0.75 s on the server, same end |
| Client tap (0.12 s) | Dash at 0.64 s locally, 0.66 s on the server, no sprint |
| Corrections, with 100 ms emulated lag and `p.NetShowCorrections 1` | 0 corrections during a 2.5 s client sprint and release, and 0 through a sprint cancelled by an attack |
| Sprint camera mode | Switched to the sprint camera and back once per sprint, five sprints on each machine |
| Regressions | Client light combo with 0 rejections; double jump; air dash on release with the server following |
| L3 and ◯ | L3 sprints at once; a ◯ tap during it cancels the sprint and dashes |

From standstill with Shift held, the sprint reaches 360 cm/s at 0.2 s and 600 cm/s at 0.4 s, after about 1.3 m.

## The pattern, for your own shared keys

- Put a tap/hold split in one action with no trigger and judge it in your character, if the threshold should come from settings or the key should remap as one name.
- Measure the threshold in real time if your game changes time dilation.
- Fire the tap action on release, and check what that does to anything timed from the activation. Here it moved the dodge timing to the right moment for free; in another game it might add input lag you need to tune.
- Decide what happens if the release frame crosses the threshold, so there is no frame where nothing happens.
- List what should end the hold action, and add its tag to those abilities' cancel lists.

One case is not handled: a press just as a menu opens can still arrive as a release and dash. It is rare enough that I left it.
