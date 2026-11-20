---
title: "A UE5 Settings Menu With Key Remapping: UGameUserSettings, Enhanced Input User Settings, a CommonUI Activatable Screen and Gamepad Navigation That Works"
description: "How I built a settings screen for a UE5 action game in C++: a UGameUserSettings subclass for graphics, audio and gameplay values, Enhanced Input user settings for keyboard and gamepad remapping, a CommonUI activatable widget in Menu input mode, explicit navigation for every button, the CommonUI.ShouldVirtualAcceptSimulateMouseButton fix for a pad accept that did nothing, and sound class volumes that don't depend on parent and child mixing."
date: 2026-11-22
workedOn: 2026-10-23
publishAt: 2026-11-22
track: "Settings and remapping"
category: "Build Logs"
sidebar: "Settings and Key Remapping"
image: /blog/pseudo-settings-remap-c.jpg
outline: deep
tags: [UE5, Enhanced Input, CommonUI, UI, Settings]
---

# A UE5 Settings Menu With Key Remapping: UGameUserSettings, Enhanced Input User Settings, a CommonUI Activatable Screen and Gamepad Navigation That Works

This build log covers PSEUDO's first settings screen: graphics, audio, controls and gameplay, with keyboard and gamepad remapping, all usable with a pad. The pieces are standard UE5 (a `UGameUserSettings` subclass, Enhanced Input user settings, a CommonUI activatable widget), and the work was mostly in the places where they meet: a pad accept button that pressed nothing, focus that jumped off the screen, and a Defaults button that loaded the saved values. If you are building the same screen, those three fixes are the useful part.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-settings-remap-c.jpg" alt="Values in GameUserSettings, keys in Enhanced Input user settings, a screen built in C++." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-settings-remap-c-dark.jpg" alt="Values in GameUserSettings, keys in Enhanced Input user settings, a screen built in C++." loading="lazy">
</figure>

## Where each setting is stored

Settings in PSEUDO never go into the game save. A New Game keeps your layout, and progress files stay about progress. They live in two places:

- Values go in `UPseudoGameUserSettings`, a `UGameUserSettings` subclass registered with `GameUserSettingsClassName`. On top of the engine's graphics settings it holds a FOV offset, four volumes, look sensitivity, invert Y, the dodge tap threshold, a camera shake scale, subtitles and the language. All of it is written to `GameUserSettings.ini`.
- Keys go through Enhanced Input user settings (`bEnableUserSettings`), which keep their own save file.

## One screen, built in code

The screen is a `UCommonActivatableWidget` built in C++, like every menu in the game so far, with four tabs (Graphics, Audio, Controls, Gameplay) and a footer with Apply, Revert, Defaults and Back. It opens from the main menu's OPTION button and from a new Settings button in the in-game menu.

I used CommonUI for the parts that matter for input and kept the rest plain. The screen is an activatable widget, which gives it focus on activation and a Menu input mode while it is open, and CommonInput drives the hint line that shows pad or keyboard prompts. The tabs and rows are plain `UButton`s. CommonUI's tab list needs `UCommonButtonBase` tab classes with their own designer widgets and styles, which is styling work for the UI polish pass.

While the screen is open, `GetDesiredInputConfig` returns `ECommonInputMode::Menu` with no mouse capture. The game gets no input (no movement, and Esc or Options don't toggle the game menu underneath), and every key reaches the screen, which key capture needs. When the screen closes, CommonUI resets the input config, and the game's own `SetInputMode` calls are in charge again.

Every change is pending until Apply. Revert reloads the saved values, Defaults loads defaults (graphics at Epic, keys reset) but still needs Apply, and Back drops anything not applied. That is the smallest rule I could think of that stays clear without an "unsaved changes" prompt.

## The pad accept button that pressed nothing

The first pad test failed everywhere: ✕ (A on Xbox) did nothing on any menu, the main menu included. With the CommonUI game viewport client, the virtual accept key is turned into a simulated mouse click at the cursor position, and with the cursor hidden somewhere else, the focused button never got pressed. One line in `DefaultEngine.ini` under `[SystemSettings]` fixed it:

```ini
CommonUI.ShouldVirtualAcceptSimulateMouseButton=0
```

## Focus that jumped to the footer

The second failure was navigation. Each row sits to the right of its label, so the engine's geometric navigation search from a tab went straight down to the footer, skipping the whole page, and from there could leave the screen into the menu below it.

Every button now has explicit (custom) navigation. Up and Down walk the rows of the current page, and the key rows keep their column (keyboard or pad). Left and Right step a value, switch tabs, or move along the footer. Nothing leads off the screen. In the pad test, R1 and L1 reached all four tabs, D-pad Down reached every control on each page (16, 4, 33 and 3), and the footer buttons answered to their face buttons: □ applies, △ loads defaults, ◯ closes and puts focus back on OPTION.

## A Defaults button that loaded the saved values

The third bug was quieter. Defaults reset the screen to what was already saved. The settings class default object holds the loaded config, not the literal defaults, so reading "defaults" from it returned the player's own values. The defaults now come from literal values in code.

## Remapping with Enhanced Input user settings

The Controls tab has a keyboard and mouse column and a gamepad column for each mappable name. Enhanced Input puts the keyboard and pad keys of one name into its first and second slots, and the screen remaps the slot that holds that device's key in the input mapping context. I didn't add new slots: a column with no default key shows "-" and can't be remapped, because a player-made slot didn't reliably reach `RebuildControlMappings`.

Capture takes the next key down from the right device, with mouse buttons counting as keyboard and no axes. Esc and Options cancel (the menu keys can't be remapped, so the menu always opens), and capture times out after 8 s.

Duplicates are allowed, with a warning on the status line ("also used by X"). Some defaults already share a key on purpose, such as guard and next ammo on the same key with pistols, and automatic swapping would break those pairs.

Movement needed one change in the mapping context: W, A, S and D got their own mappable names through key mapping overrides, because a single `Move` name would put four keys in one row. Look, the menu key and mouse-wheel ammo cycling stay fixed; the first two are axes or must stay reachable. The full list of mappable actions is on the wiki's [Controls](/wiki/pseudo/systems/controls#remapping) page.

The test I cared about most: remap dodge from Shift to K with real key presses, apply, then restart PIE and restart the editor. K dashed 450 cm, Shift dashed 0 cm, and the screen still showed K after both restarts. With Defaults applied, Shift tap dashed and Shift hold sprinted again, as in the [tap and hold build](./2026-11-20-pseudo-dodge-tap-sprint-hold).

## Gameplay values that reach the game

- FOV is an offset (-15 to +20) added to every camera mode's own FOV, since each mode already has one.
- Look sensitivity is one multiplier for mouse and right stick. The look input can't tell the devices apart, so separate pad sensitivity waits.
- The dodge tap threshold: a value of 0 or less means "use the project default", and the value is stored only when the player changed it. A later change to the project default still reaches players who never touched it.
- Camera shake is scaled in the player camera manager's `StartCameraShake`, where every shake in the game ends up, so one number covers them all (0 turns shakes off).
- Language (System, English, Korean) and window mode and resolution are saved in PIE but only applied in a game build, because in the editor they would change the editor itself.

## Volumes without parent and child mixing

The audio tab has master, music, SFX and voice. I made a sound class for each (`SC_Master` as parent) and a sound mix that is pushed at every map start. Each class gets master times its group volume as its own volume, instead of relying on the parent class to pass master down. That way the result doesn't depend on how the engine combines parent and child adjusters. Sounds with no class follow SFX, through `DefaultSoundClassName`.

## Test results and what's left

- Graphics applied at once in PIE (shadows Low to Medium, frame limit 120, FOV +5) and loaded again after an editor restart. In a game process, 1024 x 768 windowed was applied, written to `GameUserSettings.ini` and loaded after a restart.
- Starting the game from the menu still gave control at once in the hub.
- One trap in PIE: the editor's scalability is shared with PIE, so Apply in PIE changes the editor viewport's quality too.

Not covered: a listen server with a client (each machine keeps its own settings and keys, and nothing replicates), and the volumes by ear. Still to do: styled CommonUI buttons and tabs with input icons, a separate pad sensitivity, and new key slots for actions that have no default in a column.

## For your own settings screen

- Keep settings out of the game save: values in a `UGameUserSettings` subclass, keys in Enhanced Input user settings.
- If a pad's accept button does nothing with CommonUI, check `CommonUI.ShouldVirtualAcceptSimulateMouseButton`.
- Give every button explicit navigation when rows and labels sit side by side.
- Don't read defaults from the settings CDO after config has loaded.
- Let a 0 or empty user value mean "project default" so later tuning reaches players who never changed it.
