---
title: "Start Pressed, Nothing Moves: A UI-Only Input Mode That Survived the Level Change"
description: "After pressing Start on PSEUDO's main menu, the player arrived in the hub and couldn't move or attack. The menu's FInputModeUIOnly had told the game viewport to ignore game input, and the viewport outlives OpenLevel. Why the input stack looked healthy, why Python input injection couldn't reproduce it, and the four-line fix."
date: 2026-10-22
publishAt: 2026-10-29
track: "No control after menu start"
outline: deep
tags: [UE5, Input, UI, Networking, Debugging]
---

# Start Pressed, Nothing Moves: A UI-Only Input Mode That Survived the Level Change

PSEUDO got a real main menu this week: a title, a tagline, Start and Quit. Start opens the hub map as a listen server, so friends can join from their own menus. The first time I pressed it for real, the hub loaded, my character spawned, the HUD came up, and nothing I pressed did anything. The mouse cursor was still on screen.

That's the second "WASD does nothing" bug on this project. The [first one](./2026-10-13-pseudo-player-controller-tick-blocks-input) was a player controller with tick turned off, so that's where I started. It wasn't that.

## Symptom

- `L_MainMenu` → Start → `L_Hub` (`OpenLevel(Hub, true, "listen")`): character spawned, HUD shown, WASD and the mouse did nothing, cursor still visible.
- Expected: control right away in the hub, for the host and for every client that joins.
- Repro: PIE or standalone on `L_MainMenu`, press Start (or run my `PseudoMenuStart` cheat, which makes the same `OpenLevel` call), press W.

## What I checked

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | Player controller tick disabled again | `APseudoPlayerController` and its Blueprint defaults | Ruled out: tick is on |
| 2 | The input mapping context isn't added on possess | The character adds its default mapping context in `PawnClientRestart`. In the hub, querying the Enhanced Input subsystem for the keys mapped to `IA_Move` returned W/S/A/D, the arrows and the gamepad stick; `IA_Attack_Light` returned the left mouse button | Ruled out |
| 3 | The hub runs the wrong game mode, so the wrong controller or pawn | Hub World Settings, and at runtime: game mode `BP_PseudoGameMode_C`, controller `PseudoPlayerController`, pawn `BP_PseudoPlayerCharacter_C` | Ruled out |
| 4 | An input mode left over from the menu | The menu controller sets `FInputModeUIOnly` and shows the cursor in `BeginPlay`. Nothing in the game controller sets a mode | **Confirmed** |

By the end of check 3 the whole input stack was correct: right controller, right pawn, right mapping context, keys bound. That's a useful place to be stuck in, because it means the events aren't reaching the stack at all.

### Why my usual test couldn't see it

My automated tests drive the character with Python input injection, `inject_input_vector_for_action`. That injects straight into the Enhanced Input subsystem. It never passes through the game viewport, so it moves the character just fine in this broken state. If I had only trusted the injected test, the bug wouldn't exist. Real keys come in through the viewport, and that's where they were being dropped.

## Root cause

`FInputModeUIOnly` isn't only a setting on the player controller. When you apply it, `ApplyInputMode` calls `UGameViewportClient::SetIgnoreInput(true)` and sets the mouse capture and lock behavior. The flag lives on the **game viewport client**.

The game viewport client belongs to the `UGameInstance`, not to the world. It's created once and kept across level changes. So the sequence was:

1. The menu controller's `BeginPlay` applies UI-only: the viewport now ignores game input.
2. Start calls `OpenLevel`. The menu world is torn down, along with the menu controller.
3. The hub world loads with a new player controller. The viewport is the same one as before, still ignoring game input.
4. Nothing in the hub sets an input mode, so the flag is never cleared.

The input component, the mapping context and the bindings were all fine. Key and axis events just never came out of the viewport.

## The fix

Every gameplay map should start in game-only mode, whatever the previous map left behind. So the game controller sets it itself:

```cpp
// APseudoPlayerController::BeginPlay
// The main menu's UI-only mode lives on the game viewport (it ignores game input)
// and survives the level change: every game map starts in game-only mode with the cursor hidden
if (IsLocalController())
{
	SetInputMode(FInputModeGameOnly());
	SetShowMouseCursor(false);
}
```

The `IsLocalController()` check matters on a listen server. The host also owns server-side copies of every client's player controller, and those have no viewport. Applying an input mode on them is at best pointless.

The pause menu and the ending screen already restored game-only mode when they closed. The main menu was the one path that changes the mode and then leaves the world entirely, so no one was left to restore it.

## Verification

I tested the path a real player takes, not the shortcut. A joining client also starts on its own main menu, in UI-only mode with the cursor visible, and then joins. A client that starts directly in the hub would never have had the bug, so testing with one would prove nothing.

PIE, listen server plus one client, both starting on `L_MainMenu`:

1. The host starts. It loads `L_Hub` and starts listening on port 7777. The client, still on its menu, loses its PIE connection as expected for a hard travel and falls back to the menu, still UI-only.
2. On the host, with real input (a click into the PIE viewport, then W held for one second), the character moved 338.8 cm, and the server and client copies agreed. A real left click played the greatsword's draw attack in both worlds.
3. The client joins from its menu with `open 127.0.0.1:7777` and is welcomed into the hub.
4. On the client, with real input and no extra setup: W held for one second moved 269.6 cm, on the client pawn and its server copy. A real left click played the draw attack on both.
5. Both local controllers: `PseudoPlayerController`, cursor hidden, move and look input not ignored, default mapping context active.

<figure>
  <img src="/blog/pseudo-menu-input-1.png" alt="The player character in a long pale coat raising a greatsword overhead on the flat grey hub floor, with an Enter Stage 1 prompt and the attack indicator in the corner" loading="lazy">
  <figcaption>The host in the hub right after Start, mid draw attack from a real mouse click.</figcaption>
</figure>

## What I took from it

**An input mode is global state, not controller state.** Anything that changes it has to assume the next map inherits it. The rule I follow now: every gameplay map's local controller sets its own input mode in `BeginPlay`, and every menu that changes the mode restores it when it closes.

**Input bugs in the viewport are invisible to injected input.** For anything involving focus, cursor or input mode, I now test with real key events sent to the window. Injected input is still how I test gameplay, because it's repeatable, but it skips a layer.

**Test the real flow for joining players.** "Client starts in the game map" is the convenient setup. "Client starts on its own menu and joins" is what players will do, and it's the one that would have caught this.
