---
title: Stack Up
description: "A one-button neon tower stacking game you can play in the browser. Rules, scoring, tips, and how it was built with TypeScript, Canvas 2D, and WebAudio."
outline: deep
---

# Stack Up

*Arcade Web · TypeScript, Canvas 2D, WebAudio* · [GitHub: Stack-Up](https://github.com/devcol-main/Stack-Up)

Stack Up is a one-button tower stacking game. A block slides back and forth across the screen, and you tap to drop it onto the tower. Only the part that overlaps the block below stays. Whatever hangs over the edge is cut off, so the tower gets narrower as you climb while the blocks keep getting faster. Line a block up almost exactly and it counts as a Perfect, which scores more and, if you keep a streak going, slowly gives back the width you lost. If a block misses the tower completely, the run is over.

<GameFrame slug="stack-up" title="Stack Up, a one-button tower stacking game" hint="Click the game once, then Space works too." />

## How to play

- Tap, click, or press Space to start and to drop a block. The keyboard only works after the game has focus, so click it once first.
- Press M or use the Sound button to mute. The Options panel has separate BGM and SFX switches with volume sliders, a Reduced motion setting, and a button that clears your best score and Top 10.
- After a game over you can type a nickname and press Submit to put your score on the Top 10. Tap again to start a new run.

Scores are stored in your browser only. Nothing is sent to a server, so the Top 10 you see is the one on this device.

## Scoring

- Every block you stack is worth 1 point.
- A Perfect is worth 1 point plus a combo bonus equal to your current Perfect streak, capped at +5. The first Perfect in a row gives 2 points, and the fifth or later gives 6.
- A drop counts as Perfect when it lands within 4.5% of the block's own width from the block below (with a small minimum, so very thin blocks still have some room). A Perfect block snaps exactly onto the tower.
- Every 5 Perfects in a row, the block gets back 8% of its starting width. It never grows past the starting width, which is 55% of the play area.
- Any cut resets the streak to 0.
- Milestones play at 5 floors, at 10, and then every 10 floors after that.

Blocks start at 0.4 play-area widths per second and get 0.025 faster each floor, up to 1.2. That cap arrives at about floor 33. The first block comes from a random side, and after that the side alternates every floor.

## Tips

1. Go for Perfects while the blocks are still slow. Each run of 5 restores width, so an early streak decides how much room you have later.
2. The speed stays the same within a floor and the side alternates. Watch a pass or two to get the rhythm before you tap.
3. When the tower is thin, aim to overlap, not to be perfect. A big cut makes every block after it smaller too, so avoiding one large mistake matters more than one extra Perfect.
4. After about floor 33 the speed stops rising. From there it's about staying focused.
5. Each Perfect plays a note from a major pentatonic scale, one step higher for every Perfect in the streak, up to the tenth note. With sound on you can tell a streak is still alive without looking at the score.

## How it was made

**No audio files.** Every sound is synthesized with WebAudio oscillators and noise, including the background music, which is a step sequencer in A minor pentatonic at 108 BPM. That's a big part of why the whole build is 124 KB.

**Glow without `shadowBlur`.** The neon look is a starfield and gradient background with glowing blocks. Drawing glow with `shadowBlur` every frame is slow on phones, so the glow is drawn once to offscreen canvases and reused as sprites. Particles come from a fixed pool instead of being created and thrown away.

**A core that can be tested.** The rules live in plain TypeScript that knows nothing about the page, the canvas, or audio. Randomness comes from a seeded generator and time comes in as a delta, so the same seed and the same inputs always give the same run. That's what lets the rules be covered by unit tests, and it's also how the GIF in the README is made: a small bot plays a seeded run in headless Chrome and the frames are captured.

**Built for the page it lives on.** The game pauses when you switch tabs, redraws when the frame is resized, caps the pixel ratio at 2, and keeps touch drags from scrolling the page while you play. It uses no game engine, no framework, and no CDN, so everything it needs ships in the build.

Stack Up is part of [Arcade Web](/projects/arcade-web), together with [Bug Squash](/projects/bug-squash). The code is under the Apache 2.0 license, and the Geist font is bundled under the SIL Open Font License.
