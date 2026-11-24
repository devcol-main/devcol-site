---
title: Melon Merge
description: "A fruit merging puzzle you can play in the browser. Rules, scoring, the SHAKE and RIPEN powerups, special fruit, and how the physics and sound were built from scratch with TypeScript, Canvas 2D, and WebAudio."
outline: deep
---

# Melon Merge

*Arcade Web · TypeScript, Canvas 2D, WebAudio*

Melon Merge is a drop-and-merge puzzle in the style of the fruit merging games that took off a few years ago. You drop fruit into a wooden crate, and when two of the same kind touch they merge into the next bigger one, through ten levels from a cherry to a watermelon. The crate fills up fast, because every merge makes something bigger. If the pile stays above the line at the top of the crate for three seconds, the game is over.

<GameFrame slug="melon-merge" title="Melon Merge, a fruit merging puzzle game" hint="Click the game once to use the keyboard." />

## How to play

- Move the pointer to aim, and release to drop. On a phone, drag and lift your finger. On a keyboard, `←` and `→` move the fruit and `Space` or `↓` drops it. The keyboard only works after the game has focus, so click it once first.
- The NEXT chip shows the fruit after this one. New fruit is always one of the five smallest: cherry, strawberry, grape, tangerine, or apple.
- Two buttons under the crate are the powerups, SHAKE (`Q`) and RIPEN (`E`). `M` mutes, and the Options panel has separate music and sound switches with volume sliders, a reduced motion setting, a background picker, and the list of all ten fruits in order.
- After a game over you can type a nickname to put your score on the Top 10.

Scores are stored in your browser only, so the Top 10 you see is the one on this device.

## Rules

- When two fruit of the **same level** touch, both disappear and the next level appears halfway between them.
- Two **watermelons** that touch just vanish, which frees up the most space in the game.
- There is a short cooldown of 0.6 seconds between drops.
- **Game over:** a red dotted line runs just above the rim of the crate. If a fruit that has already landed stays above that line for three seconds in a row, the crate has overflowed. A big 3, 2, 1 countdown shows while it's happening, and if the fruit drops back below the line the count starts over.

## Scoring

A merge scores more the bigger the fruit that merged:

| Merging two of | Points |
|---|---:|
| Cherry | 1 |
| Strawberry | 3 |
| Grape | 6 |
| Tangerine | 10 |
| Apple | 15 |
| Pear | 21 |
| Peach | 28 |
| Pineapple | 36 |
| Melon | 45 (makes a watermelon) |
| Watermelon | 55 (both vanish) |

Your score is the sum of all your merges, so chains are where the points are. The Top 10 also records the biggest fruit you made and how many merges you did.

## Powerups

You start each game with one of each and can hold up to three.

- **SHAKE** rocks the whole crate for two seconds: ten pulses left and right, each one bumping the pile up so it loosens. Small fruit moves more than big fruit, but even a watermelon shifts, and anything of the same kind that bumps together merges and scores as usual. An invisible ceiling keeps fruit inside the crate while it shakes, and the game-over countdown pauses until the ceiling goes away, then carries on from where it stopped. It's the way out when two matching fruit are stuck apart behind a bigger one.
- **RIPEN** grows one fruit in the crate by one level, right where it is. Pressing the button opens a select mode: tap a fruit (or aim with the arrows and press `Space`) to ripen it, or tap empty space to cancel without using a charge. A ripened fruit next to one of its new level merges on the next step. Watermelons can't be ripened.

A new SHAKE arrives every 800 points and a new RIPEN every 1200. Powerups never add score on their own.

## Special fruit

Every 600 points, the next fruit to enter the queue is a special one, marked with a small badge and a softly glowing outline. It merges with any fruit of the same level and scores as usual, and the kinds take turns so you never get the same one twice in a row:

- **SHAKE** (sky-blue badge) and **RIPEN** (gold badge) give you one more of that powerup when they merge, up to the usual three.
- **BOMB** (navy badge with a lit fuse) explodes where it merges and throws nearby fruit outward and up, hardest close to the blast, which mixes up a stuck pile. The blast scores nothing itself, but fruit it knocks together can merge. An invisible ceiling keeps everything inside the crate, and the game-over countdown pauses for a moment after the blast.

## Design notes

### A fruit stand, not another neon game

Stack Up is neon and Bug Squash is a green terminal, so Melon Merge went the other way: a bright daytime look with a light wooden crate, flat vector fruit with their own stems, leaves and stripes, and warm brown text. The font is Fredoka. Behind the crate is one of five backgrounds, most of them gently moving (a fruit stand with a striped awning, a gingham picnic cloth, an orchard, patterned wallpaper and a watercolor wash). A new one is picked for every game, or you can pin your favorite in Options. Every fruit has its own shape details as well as its own color, after the first cherry and apple turned out to be the same red circle with a stem.

### Proportions

The crate is about 1 wide to 1.45 tall, and the game-over line sits just above the rim rather than inside the crate. The fruit grow gently from level to level: the smallest is about 11% of the crate's width across and the watermelon about 43%. Early builds had a tall, narrow crate and a watermelon almost as wide as the crate, which made the last few levels a matter of luck. The current numbers came from measuring frames of gameplay videos of other games in the genre, and they make a long run feel like planning instead.

### Soft fruit

Fruit is a little jelly-like. When a fruit hits something it squashes against the side it touched, wobbles two or three times and settles in about 0.7 seconds, and fruit at the bottom of a pile sags a little under the weight on top. A hard landing flicks a few drops of juice. When two fruit merge, they stretch toward each other and get sucked into the merge point, then the new fruit pops in with a small overshoot, a ring and a burst of particles in its color. These are drawing effects only; the physics underneath is unchanged. Reduced motion, taken from the OS setting or the Options panel, cuts the wobble and the crate shake down and removes the screen shake.

## How it was made

There is no physics engine. The fruit are circles in a small rigid-body simulation written for this game, with gravity, friction, bounce, rolling and rotation, stepped at a fixed 1/120 of a second. Randomness is seeded, so the same seed and the same inputs, shakes included, always give the same game. The rules sit in a core that takes the elapsed time and returns a list of events (drop, merge, impact, danger, game over, powerups), and the renderer, the sound and the HUD all react to that list.

All the sound is generated in the browser. A merge plucks a marimba-like note on a pentatonic scale that rises with the fruit's level, a watermelon plays a short rising arpeggio, and the background music is a light 95 BPM loop. There isn't a single audio file in the build, and the whole game, font and logo included, is about 208 KB.

Melon Merge is part of [Arcade Web](/projects/arcade-web), together with [Stack Up](/projects/stack-up), [Bug Squash](/projects/bug-squash) and [Jet Rush](/projects/jet-rush). The code is under the Apache 2.0 license, and Fredoka is bundled under the SIL Open Font License.
