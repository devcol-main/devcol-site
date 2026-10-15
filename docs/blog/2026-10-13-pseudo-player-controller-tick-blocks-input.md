---
title: "Why WASD Did Nothing: A Player Controller with Tick Turned Off"
description: "In UE5 PIE the pawn spawned and the camera was right, but WASD and mouse look did nothing. Every binding was correct. The cause was bCanEverTick = false on the PlayerController, because the controller processes input in its tick."
date: 2026-10-13
track: "Player controller tick bug"
outline: deep
---

# Why WASD Did Nothing: A Player Controller with Tick Turned Off

In PIE the pawn spawned, the camera was in the right place, and neither WASD nor the mouse did anything. The mapping context, the input assets and the bindings were all correct. The cause was one line in my `APseudoPlayerController` constructor: `PrimaryActorTick.bCanEverTick = false`. A player controller processes input inside its tick, so with tick off it never reads a key.

## The setup

- `BP_PseudoGameMode` (parent `APseudoGameModeBase`): default pawn `BP_PseudoPlayerCharacter`, player controller `APseudoPlayerController`.
- `BP_PseudoPlayerCharacter`: input config `DA_InputConfig_Default`, default mapping context `IMC_Default`.
- `IA_Move`, `IA_Look`, `IA_Jump` and `IMC_Default` copied from the Third Person template into `/Game/Input/`.
- Input tags registered natively in C++ (`InputTag_Move`, `InputTag_Look`).

The repro: open the prototype map, play in the viewport with one player, click, press W, move the mouse. Nothing.

## What I ruled out

I went through twelve hypotheses. Most of them were dead ends, and I'm listing them because the order matters for the lesson at the end.

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | Wrong GameMode or pawn | Output Log showed `BP_PseudoGameMode_C` and the pawn spawning at PlayerStart | Ruled out |
| 2 | Mapping context not registered | Temporary log after `AddMappingContext`: `HasMappingContext = 1` | Ruled out |
| 3 | Assets point at the wrong IA (they were copied from the template) | Package references: `IMC_Default` and the input config both use `/Game/Input/Actions/IA_*` | Ruled out |
| 4 | Binding failed (null config, tag not found) | Log in `SetupPlayerInputComponent`: valid input component, config loaded, both actions found | Ruled out |
| 5 | Handler never runs | Log in `Input_Move`: never printed | Confirmed |
| 6 | A level actor or level blueprint blocks input | Map only had lights, sky, floor, PlayerStart | Ruled out |
| 7 | Project input settings | `DefaultInput.ini` has the Enhanced Input classes set | Ruled out |
| 8 | Viewport has no keyboard focus | `~` opens the console in PIE | Ruled out |
| 9 | Korean IME swallowing key presses | Switched to English mode, retested | Ruled out |
| 10 | Action not evaluated | `showdebug enhancedinput`: the context is active and the keys are listed, but `IA_Move` stays 0 while W is held | Confirmed |
| 11 | Something specific to my classes | The Third Person template character moves fine in the same editor | Confirmed |
| 12 | The player controller doesn't process input | Read its constructor: `bCanEverTick = false` | **Root cause** |

Rows 10 and 11 are what narrowed it down. The key was in the active mapping context, but its value never reached the action, and a known-good template character in the same editor worked.

## Why tick matters here

`APlayerController` handles input from its tick: `TickActor`, then `PlayerTick`, then `TickPlayerInput`, which calls `ProcessPlayerInput` and then `UpdateRotation`. With `bCanEverTick = false` the controller never ticks, so two things stop:

- Enhanced Input never evaluates key state, so no action triggers. `IA_Move` stays 0 and `Input_Move` is never called.
- Control rotation is never updated, so mouse look does nothing even if yaw and pitch values were being added.

I got here because I'd set a rule for my class template, "`bCanEverTick = false` by default", and applied it to every new class, including this one. It was hard to see because everything around it was correct, and the engine doesn't log a warning when a controller can't tick.

## The fix

```cpp
// Before
APseudoPlayerController::APseudoPlayerController()
{
	PrimaryActorTick.bCanEverTick = false;
}

// After
APseudoPlayerController::APseudoPlayerController()
{
	// Must stay true: the player controller processes input in its tick.
	PrimaryActorTick.bCanEverTick = true;
}
```

After that, WASD moved the character relative to the camera and the mouse orbited it. I then removed the temporary diagnostic logs. I haven't tested two players (listen server plus client) yet.

## What I changed in my own rules

- `bCanEverTick = false` stays the default, with exceptions for anything whose engine base class relies on actor tick. `APlayerController` and its subclasses are the first one on that list. I check the base class before turning tick off.
- A class that needs tick sets it to `true` with a one-line comment saying why, so nobody (me, later) "fixes" it back out of habit.
- When input does nothing, I now go in this order:
  1. `showdebug enhancedinput`. Is the mapping context active, and does the key show a value when pressed?
  2. If the key shows no value, suspect the controller (tick, `DisableInput`, input mode, IME), not the bindings.
  3. If the key shows a value but the action doesn't fire, check the action's triggers and modifiers.
  4. If the action fires but nothing moves, check the binding and the handler.
- Compare against a known-good baseline early. Trying the template character pointed at my own classes immediately, and I should have done it before hypothesis 5.

## Two smaller problems from the same session

- **C1083 include error.** `#include "Character/PseudoPlayerCharacter.h"` failed until I added the module root to the include path with `PublicIncludePaths.Add(ModuleDirectory);` in `PSEUDO.Build.cs`. My rule now: headers in the same folder use `"File.h"`, headers in other folders use module-root paths like `"Character/File.h"`.
- **"Cannot delete tag."** After I registered `InputTag.Move` and `InputTag.Look` natively in C++, the Gameplay Tag Manager wouldn't delete the old ini copies. I closed the editor and removed the two `+GameplayTagList` lines from `Config/DefaultGameplayTags.ini` by hand.
