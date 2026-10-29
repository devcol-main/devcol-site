---
title: "Controls: Keyboard, Gamepad and Remapping"
description: "PSEUDO's full control scheme on keyboard and mouse and on a gamepad, how the buttons change between melee, dual pistols and the stowed state, the tap-versus-hold rules on shared buttons, and which actions players can remap."
publishAt: 2026-11-04
outline: deep
---

# Controls: Keyboard, Gamepad and Remapping

This page is the control scheme as it stands in the build, for keyboard and mouse and for a gamepad. The combat pages explain what each action does; this one explains which button does it, and why a few buttons do two things.

The layout changes with what you're holding. PSEUDO has three weapon states: a **melee** weapon drawn (the greatsword), the **dual pistols** drawn, and **stowed**, where weapons are on your back and you're out of combat. Most keys keep one meaning everywhere. The exceptions are the guard key and the lock-on key, which mean something else with the pistols out.

Gamepad names below are PlayStation, with Xbox in brackets.

## Keyboard and mouse

| Action | Melee drawn | Dual pistols drawn | Stowed |
|---|---|---|---|
| Move / look | WASD / mouse | WASD / mouse, always aiming (strafe + crosshair) | WASD / mouse |
| Light attack / fire | LMB | LMB fires the selected ammo (hold = automatic; laser: hold to charge, release to shoot) | LMB: draw and attack |
| Heavy / charge | RMB | Not used yet | — |
| Jump | Space | Space | Space |
| Dash | Tap Shift (dash on release) | Tap Shift | Tap Shift |
| Sprint | Hold Shift 0.2 s or more | Hold Shift | Hold Shift |
| Guard (hold) / perfect parry (timed press) | E | **E: next ammo type**, no guard or parry | — |
| Skill chords A / B | Hold E + LMB / RMB, hold Left Ctrl + LMB / RMB | Same | — |
| Interact / pick up | F | F | F |
| Weapon swap | Tab | Tab | Tab: draw the melee weapon |
| Dice roll (tap) / All-in (hold) | R | R | R |
| Dice type | G | G | G |
| Lock-on / switch target / release (hold) | Mouse wheel click | **Hold wheel click: ammo wheel**, no lock-on | — |
| Ammo type | — | Mouse wheel up / down (also E and the ammo wheel) | — |
| Potion (hold = consumable menu) | Q | Q | Q |
| Quick slots | 1–4 | 1–4 | 1–4 |
| Menu (equipment, skill tree) | Esc | Esc | Esc |

## Gamepad

| Action | Melee drawn | Dual pistols drawn | Stowed |
|---|---|---|---|
| Move / look | Left / right stick | Left / right stick, always aiming | Left / right stick |
| Light attack / fire | ▢ (X) | ▢ fires the selected ammo (hold = automatic / charge) | ▢: draw and attack |
| Heavy / charge | △ (Y) | Not used yet | — |
| Jump | ✕ (A) | ✕ | ✕ |
| Dash | Tap ◯ (B), dash on release | Tap ◯ | Tap ◯ |
| Sprint | Hold ◯ 0.2 s or more, or hold L3 | Same | Same |
| Guard (hold) / perfect parry (timed press) | L1 (LB) | **L1: next ammo type**, no guard or parry | — |
| Skill chords A / B | L1 + attack, R1 + attack | Same | — |
| Interact, otherwise weapon swap | L2 (LT) | L2 | L2 |
| Dice roll (tap) / All-in (hold) | R2 (RT) | R2 | R2 |
| Dice type | D-pad left / right | D-pad left / right | D-pad left / right |
| Lock-on / switch (press), release (hold) | R3 | **Hold R3: ammo wheel**, no lock-on | — |
| Ammo type | — | Touchpad, also L1 and the ammo wheel | — |
| Potion (hold = consumable menu) | D-pad up | D-pad up | D-pad up |
| Other item | D-pad down | D-pad down | D-pad down |
| Menu | Options | Options | Options |

A gamepad has fewer buttons than a keyboard, so two things are folded together. L2 interacts when something interactable is in focus and in range, and swaps weapons otherwise. Pickups are blocked while a hostile is nearby, so you don't grab a potion off the floor when you meant to swap mid-fight.

## One button, two actions: tap and hold

Three buttons do different things depending on how long you hold them, and all three use the same rule: a press shorter than 0.2 seconds is a tap, anything longer is a hold.

### Dash and sprint

Dash and sprint share Shift (◯ on a pad), the way Souls games do it.

- **Released before 0.2 s**: a dash, and it fires **on release**, not on press. The perfect-dodge window is measured from the release too, so the timing you feel is the timing the server judges.
- **Held 0.2 s or more**: a sprint, with no dash at the start, until you let go.

The first version dashed on press and turned into a sprint if you kept holding. The timing was exact, but every sprint began with a dash you didn't ask for, which spent your dodge right before you might need it. Firing the dash on release costs up to 0.2 s of latency on a dodge, and that's the trade I took.

Sprint ends when you release the button, attack, fire while aiming, guard, roll a die, dash, or get hit. Holding Shift through an attack does not restart the sprint afterwards: press it again. That way a sprint is always something you chose, never a leftover from before a fight.

On a gamepad, holding L3 sprints at once with no threshold, for players who'd rather keep ◯ as a pure dodge.

The 0.2 s threshold isn't a constant in code. It's a project setting today and becomes a per-player option in the settings menu, because how long a "tap" is varies from person to person.

### Dice: roll or All-in

R (R2) taps to roll one die of the selected type, and holds to go All-in. What All-in does is on the [Dice](/wiki/systems/dice) page.

### Lock-on

With a melee weapon, wheel click (R3) locks on, presses again to switch target, and a hold releases the lock. Lock-on is soft: the camera assists but you keep control of it.

## Why ranged changes the layout

With the pistols out, two keys change meaning, and that was a deliberate redesign rather than a lack of buttons.

**E / L1 becomes "next ammo type".** Ranged mode has no guard and no parry: you're meant to keep moving and shooting, and a dodge is your defense. That freed the guard key, and it's the most reachable key for the thing you do most in ranged mode, which is changing ammo. LMB always fires whatever is selected, so there's one trigger and one selector. Ammo types with no stock left are skipped.

**Lock-on hold becomes the ammo wheel.** Drawing the pistols drops any lock, because shots go where the crosshair points. Holding the lock-on key for 0.2 s opens a radial wheel of unlocked ammo types, with stock counts and empty types greyed out; you pick a direction and release to confirm. In single player the world slows to 0.2x while the wheel is open. In multiplayer nothing slows down, since one player can't slow the world for everyone. A short press does nothing with the pistols out.

The mouse wheel still cycles ammo too, because scrolling is the habit most PC players bring from shooters. The [Weapons](/wiki/systems/weapons) page covers the ammo types themselves.

## Remapping

The settings menu has a Controls tab with a keyboard-and-mouse column and a gamepad column for every remappable action:

- Movement (forward, back, left, right). The arrow keys and the left stick stay fixed as a fallback.
- Jump, Dodge (tap and hold follow the same key), Interact, the alternate sprint key
- Light attack, Weapon swap, Guard, Lock-on, Next ammo
- Dice roll, Dice type

Look, the menu key and mouse-wheel ammo cycling are fixed. Assigning the same key to two actions is allowed and only shows a warning; I'd rather let a player make an odd layout on purpose than block one they chose.

The tap/hold threshold, look sensitivity and invert Y are per-player settings in the same tab. Settings are saved per user, separately from the game save, so a new playthrough keeps your layout.

## Related pages

- [Defense](/wiki/systems/defense): guard, parry, dodge and the perfect windows the keys feed into.
- [Combos and Cancels](/wiki/systems/combo-and-cancels): the input buffer and skill chords.
- [Movement and Level Metrics](/wiki/systems/level-metrics): how fast the dash and sprint actually move you.
