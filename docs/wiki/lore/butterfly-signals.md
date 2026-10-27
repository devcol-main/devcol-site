---
title: "Butterflies: The Signal System"
description: "Why the butterfly is PSEUDO's central motif and how butterflies carry information in play: count, brightness and motion first, then three signal colors (ice, amber, ember). The butterflies for each dice grade, doubles, perfect-combo streaks and stage clears, the accessibility rules, and why an earlier seven-color scheme was dropped."
publishAt: 2026-11-03
outline: deep
---

# Butterflies: The Signal System

The butterfly is PSEUDO's main symbol. It's on the logo, it flies out of good dice rolls, it multiplies while you keep a perfect combo going, and it's what you collect when you clear a stage. This page covers why it's a butterfly and the rules for what a butterfly on screen is telling you.

## Why a butterfly

The motif comes from Zhuangzi's Butterfly Dream: a man dreams he's a butterfly, wakes, and can't say for sure which of the two is dreaming the other. In lucid-dreaming circles the butterfly stands for the boundary between waking and dreaming, and for transformation, since a butterfly is the end of a metamorphosis. Both fit a game about a man who logs in to another world every day. (More on the setup in [World and Tone](/wiki/lore/world-and-tone).)

The game never explains this. There's no codex entry about Zhuangzi. The butterfly just keeps showing up at the moments that matter: loading, a great roll, a clean streak, a cleared stage. The meaning is meant to build up through repetition rather than through text.

## How butterflies are drawn

Butterflies, like the game's other symbols, are drawn as **thin glowing line art** rendered with Niagara particles and materials, not as realistic 3D insects. That choice does three things:

- It's affordable for a solo project, and quality effort can go where it's seen most: the butterfly is the one effect worth polishing.
- It gives every symbol in the game one visual language.
- Against a realistic world, a drawn, glowing shape reads clearly as *a sign* rather than as wildlife.

Because everything is driven by a few particle parameters (color, spawn count, brightness, speed), one butterfly system can express every signal below.

## Count, brightness and motion come first

Color is the last thing a butterfly uses to say something. Before color, there's:

- **How many.** One butterfly, a few, many, or a swarm.
- **How bright.** Dim to full glow.
- **How it moves.** Slow, drifting flight versus quick, lively flight.

These three survive every condition color doesn't: a dark scene, a busy fight, a player with color vision deficiency, a glance at the edge of the screen.

## Three signal colors

The game's brand colors (logo, menus, HUD frame) are restrained: one or two colors plus neutrals. On top of that sits a small set of **signal colors**, used only when something meaningful happens.

| Color | Meaning |
|---|---|
| **Ice** | Neutral. The default, a normal result, the hub's resting tone. |
| **Amber** | Something good. Success, critical success, a perfect dodge or parry, a perfect-combo streak. |
| **Ember** (a red glow) | Warning. A critical failure, danger. |

Three colors is a deliberate limit. Any more and the player has to learn a code; three can be read without learning anything.

## Butterflies by dice result

Every [2d6 roll](/wiki/systems/dice) ends with butterflies, and each grade has its own combination of color, count and energy:

| Result (sum) | Color | Count | Brightness and motion |
|---|---|---|---|
| Critical failure (2) | Ember | One | Slow |
| Failure (3–5) | Ice | A few | Dim |
| Normal (6–8) | Ice | Some | Normal brightness |
| Success (9–11) | Amber | Many | Bright |
| **Critical success (12)** | Amber | A swarm | Brightest |
| Doubles (any) | That grade's color | Twice as many | |

A critical failure isn't a red explosion. It's one ember butterfly, flying slowly. The failure is felt through the emptiness of the screen, not through a punishment effect. One open question is whether a critical success should end with a single burst through every color; that's undecided.

## Streaks: perfect combo inputs

Hitting a combo input inside its perfect window raises the damage of the next hit, and the bonus stacks while the streak lasts (the [combo page](/wiki/systems/combo-and-cancels) has the rules). The streak shows up as **amber butterflies around the character, one more for each perfect input**. Miss the timing, finish the combo, or take a hit, and the streak resets: the butterflies scatter.

This is the signal the player sees most often, and it's the one that ties the two halves of the core idea together on screen. Skill makes butterflies; the dice turn them into a swarm or a single ember.

## Stage clears: a collection

Clearing a stage awards one butterfly. It goes on display in the hub as part of a butterfly collection, next to the boss trophies.

Collected butterflies are always ice. Their color doesn't say anything; their number does. How many you've gathered is a record of how far you've come.

## Rules

- **Color is never the only signal.** Every butterfly signal also changes count, size, wingbeat speed, sound, or an accompanying icon. A player who can't tell amber from ember still sees one slow butterfly versus a bright swarm.
- **Butterflies have a glowing outline**, so ember and ice don't disappear against dark backgrounds.
- **No explanatory text.** Color meanings differ between cultures, and a tooltip would flatten the symbol into a legend. Repetition does the teaching.
- **Real difficulty strips the colors.** The hard mode cuts the UI down to the dice faces themselves, and the current plan is to turn off the colored butterfly effects there too. That's not final.

## The seven-color scheme that was dropped

An earlier version of the design gave butterflies seven colors, each borrowed from the meanings butterfly colors carry in folklore, art and tattoos: white for a new beginning, yellow for fortune, orange for courage and success, red for vitality, blue for calm, purple for mystery, black for warning and secrets. Each had a list of moments it could mark.

It was a good list of associations and a bad signal system. Seven colors meant the player would have to learn a code, several of the colors are hard to separate for color-blind players, and the meanings are far from universal. The three-color version keeps what the player needs to read in a fight. The old list stays in the design doc as a pool of ideas if the game ever wants a richer palette for moments where reading speed doesn't matter.
