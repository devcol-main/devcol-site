---
title: "Bug Squash: Rebuilding a Neon Copy as a Retro Terminal"
description: "The second Arcade Web game worked on the first pass but looked and sounded like Stack Up. Notes on rebuilding it as a retro terminal, redrawing bugs that read as space invaders, and adding keyboard play and an empty-cell penalty."
date: 2026-10-14
track: "Bug Squash terminal redesign"
outline: deep
tags: [TypeScript, Game Design, WebAudio]
image: /blog/bug-squash-cover.jpg
---

# Bug Squash: Rebuilding a Neon Copy as a Retro Terminal

[Bug Squash](/projects/bug-squash) is whack-a-mole with bugs. They pop up in a grid, you squash them before they hide, and you leave the working features alone. It went through the same write, check, review loop as [Stack Up](./2026-10-13-arcade-web-stack-up), in nine steps, all on the same day.

![The terminal version of Bug Squash: a combo in progress (left) and a +10 hit (right)](/blog/bug-squash-cover.jpg)
*The terminal version of Bug Squash: a combo in progress (left) and a +10 hit (right).*

## Two steps at the limit

Each step gets three attempts before it stops and waits for me. Stack Up never came close. Bug Squash used all three twice.

One was the renderer. Its first attempt clipped the bugs' antennae and glow, and the board expansion from 3x3 to 4x4 was easing over the whole 1.5-second pause instead of its 0.6 seconds. The second attempt fixed both, but a check in the browser showed the hard bug's antennae still poked past the cell outline. The sprite was sized to the cell's box, not to the cell as it's drawn. The third attempt passed.

The other was the UI. Its first attempt put the lives in the middle of the HUD and made them small, when the spec said top right. The second attempt broke something I had asked for: closing the options panel returned focus to the Options button, so the next Space press opened the panel again. The agent had done what it was told, and the instruction was wrong. The third attempt passed.

There was one more catch worth writing down. Rounded rectangles were drawn with `roundRect`, which iOS 15 Safari doesn't have, and the game froze there. The reviewer flagged it and there's a fallback now.

## It worked, and it was Stack Up again

At the end of the day the game was complete and playable, and it looked and sounded like Stack Up. Same dark purple neon, same star field, same perspective grid, same kind of synth pads. It felt like an extra level of the first game.

So I threw out the visuals and the sound and kept everything else: the rules, the scoring, the numbers, the controls, and the screen flow. The new concept is a retro terminal:

- A near-black background with faint lines of "code" drawn as short bars, scrolling up one line at a time like terminal output
- A CRT overlay with scanlines, a vignette, and a slight flicker
- Square cells that look like small terminal windows
- JetBrains Mono for every piece of text, and buttons that read like `[Sound: on]`
- Pixel-art bugs that dissolve into pixels when squashed, a glitch that tears the screen when you hit a feature, and a CRT power-off at game over
- A chiptune soundtrack: an 8-bar loop at 150 BPM with a pulse-wave lead, a triangle bass, and noise drums

That also set a rule for every game after it. Each one gets its own concept and doesn't borrow another game's look or sound.

## Bugs that looked like someone else's

The first pixel bugs were wide and flat with claws on the sides. In the browser they read as Space Invaders aliens. That was the wrong message, and it was also a look that belongs to another game. In the same pass the blinking cursor on the golden bug looked like a face.

The bugs were redrawn as beetles seen from above: taller than wide, a narrow head, a waist, three legs per side, and no gaps that could pass for eyes. There are unit tests on the sprite data for those properties now, so a later edit can't drift back toward the old shape.

## Smaller catches in the redesign

- The combo multiplier flashed an inverted block when it went up. The block covered the whole HUD width and hid BEST and the lives.
- Dim text on the near-black background had a contrast ratio of about 2.5:1.
- The music had a cap of 12 voices playing at once, and the loop's busiest moment needed exactly 12. So every time the loop came around, the hi-hat on the downbeat got dropped. The cap is 20 now, and a test pins the peak at 14.
- At game over the CRT power-off was hidden behind the game over overlay. The overlay now waits for the effect to finish.

The leaderboards also changed in this pass. Each game keeps its own Top 10, but the nickname and player ID are shared across games. The reviewer found that after a Reset, submitting an empty name overwrote the shared nickname with "Anonymous".

## Keyboard play, and a penalty for empty cells

Next I wanted it playable from a keyboard. The left 4x4 block of keys maps onto the board: `1 2 3 4`, `Q W E R`, `A S D F`, `Z X C V`, and only the top-left 3x3 of that while the board is 3x3. Keys are read by their physical position (`KeyboardEvent.code`), so a Korean IME or a Dvorak layout still maps the same keys to the same cells. After your first key press, each cell shows its key in its title bar.

I also wanted it harder. Tapping an empty cell now costs a life and resets your combo, with no grace period. A cell is empty the moment its bug is gone.

The key hints had a bug that the first browser check missed. The hint glyphs are drawn once and cached, and they depend on the font. When the font finished loading, the cache was cleared but never rebuilt, so the hints only appeared after the window was resized. The browser check didn't notice because the window had been resized during it. The reviewer caught it, and the second check was a plain reload with no resize.

## Where it ended

The production build is 164 KB with the font and logo, and there are no sound files. You can [play it here](/projects/bug-squash).

The next day both games moved out of the shared repository into their own, which is [the next post](./2026-10-15-arcade-web-one-repo-per-game).
