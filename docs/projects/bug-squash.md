---
title: Bug Squash
description: "A retro-terminal whack-a-bug game you can play in the browser. Rules, scoring, difficulty, and the design decisions behind it."
outline: deep
---

# Bug Squash

*Arcade Web · TypeScript, Canvas 2D, WebAudio* · [GitHub: Bug-Squash](https://github.com/devcol-main/Bug-Squash)

Bug Squash is whack-a-mole where the moles are bugs. They pop up in the cells of a retro terminal, and you squash them before they hide again. Some cells hold features instead, which are working code you must leave alone. You start with three lives, the board grows from 3x3 to 4x4 at 45 seconds, and when you run out of lives the screen says **Build failed**.

<GameFrame slug="bug-squash" title="Bug Squash, a retro-terminal whack-a-bug game" hint="Click the game once to use the keyboard." />

## How to play

| Input | Action |
|---|---|
| Tap or click a cell | Squash whatever is in it |
| `1 2 3` / `Q W E` / `A S D` | The cells of the 3x3 board |
| `1 2 3 4` / `Q W E R` / `A S D F` / `Z X C V` | The cells of the 4x4 board |
| `Space` | Start or retry |
| `M` | Mute |

Keys are matched by where they sit on the keyboard, not by the letter they type, so the layout works the same with a Korean IME or a non-QWERTY keyboard. After your first key press, each cell shows its key in the corner.

## Rules

- Squash a **bug** before it hides. If one escapes, you lose a life.
- A **hard bug** (bigger, orange, double shell) takes two hits. The first one cracks it.
- A **golden bug** is a bonus. It's worth 50 points times your combo, and it gives back a life if you're missing one. Letting it go costs no life, but it resets your combo.
- A **feature** (the cyan gear) is working code. Tapping it costs a life.
- Tapping an **empty cell** also costs a life. Tapping outside the board is free.

The empty-cell rule came after the first playable version. Without it, the best strategy was to mash every cell as fast as possible, so a tap didn't mean anything. There's no grace period either: a cell is empty the moment its bug is gone.

## Scoring

| Target | Points |
|---|---|
| Bug | 10 |
| Hard bug | 25 |
| Golden bug | 50 |

Points are multiplied by your combo, which counts squashes in a row: x2 from 5, x3 from 10, x4 from 20. Missing any bug, tapping a feature, or tapping an empty cell resets the combo. Your score never goes down. Mistakes cost lives and combo, not points.

## Difficulty

Difficulty follows play time, and time spent paused doesn't count.

| | Start | Change | Limit |
|---|---|---|---|
| Time between spawns | 1.0 s | x0.985 every second | 0.35 s (about 69 s in) |
| Time a bug stays up | 1.4 s | −0.012 s every second | 0.6 s (about 67 s in) |
| Share of features | 10% | +0.3 points every second | 30% (about 67 s in) |
| Targets on screen at once | 2 | 3 from 30 s, 4 on the 4x4 board, 5 from 90 s | |

Golden bugs start showing up at 15 seconds and hard bugs at 20. So the first minute is a warm-up, and somewhere past the 70-second mark every curve has hit its limit and the game stops getting harder.

A few things are there to keep it fair. Taps during the board expansion are ignored instead of counted as mistakes. The first frame after you come back to the tab can't cost you a life. After game over, input is locked for 0.6 seconds so a last panicked tap doesn't skip the results screen.

## Design notes

### A different game, not a level pack

The first version of Bug Squash used the same look and sound as Stack Up: dark purple neon, a star field, synth pads. It played fine, but it felt like an extra level of Stack Up rather than its own game. So it was rebuilt as a retro terminal. The background is near-black with faint bars of "code" scrolling up behind a CRT overlay with scanlines. The cells look like small terminal windows, all the text is JetBrains Mono, and the buttons read like `[Sound: on]`. Squashed bugs dissolve into pixels, tapping a feature tears the screen with a horizontal glitch, and game over is a CRT power-off. That rebuild set a rule for Arcade Web: every game gets its own look and sound.

### Bugs that don't look like someone else's

The first pixel-art bugs were wide and flat with claws on the sides, and they read as space invaders. That was both the wrong message and a look that belongs to another game. They were redrawn as beetles seen from above: taller than wide, a narrow head, a waist, three legs per side, and no gaps that could pass for eyes. Unit tests check those properties on the sprite data, so a later edit can't slide back toward the old shape.

### Playable without color

Bugs and features differ in shape as well as color. A bug is a beetle silhouette, a feature is a round gear with a hole, and a hard bug is a little bigger with a double shell. You can play the whole game in grayscale. Reduced motion, taken from the OS setting or the Options panel, turns off the glitch, the CRT flicker, and the power-off, and halves the pixel debris.

## How it was made

All the sound is generated in the browser. The soundtrack is an 8-bar chiptune loop at 150 BPM with a pulse-wave lead, a triangle bass, and noise drums, scheduled ahead of time so it stays on the beat when frames drop. Squashing a bug plays a mechanical-keyboard click plus a blip that rises with your combo.

The rules sit in a core that takes taps and elapsed time and returns a list of events: caught, missed, feature tapped, board expanded, game over. Rendering, audio, and the HUD all react to that list. Randomness is seeded, so the same seed and the same inputs give the same game, and the project has 487 automated tests over the rules, the difficulty curve, input mapping, layout, and audio scheduling. The production build is about 164 KB, font and logo included.

Bug Squash is part of [Arcade Web](/projects/arcade-web), together with [Stack Up](/projects/stack-up). The code is under the Apache 2.0 license, and JetBrains Mono is bundled under the SIL Open Font License.
