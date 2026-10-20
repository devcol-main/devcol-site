---
title: "PSEUDO Wiki"
description: "Game design reference for PSEUDO, a solo Unreal Engine 5 action RPG built on 2d6 dice: how the systems work, why they work that way, and the world they sit in."
publishAt: 2026-10-20
---

# PSEUDO Wiki

This is the design reference for [PSEUDO](/blog/pseudo), the action RPG I'm building solo in Unreal Engine 5. The [DevLog](/blog/) records what happened while building it. The wiki records what the game *is*: the rules, the numbers behind them, and the reasoning that got them there.

Every page here is written from the working design documents in the game's repository. When a design changes, the page changes with it, and the page says what changed.

## Sections

- **[Systems](/wiki/systems/)**: how the game plays. Dice, combat, elements, damage, progression.
- **[Lore](/wiki/lore/)**: the world, its symbols, and the tone of the story, without the twists.

## How to read the numbers

PSEUDO is data-driven. Stats, skill values, dice results and monsters live in spreadsheets that are imported into the engine as DataTables, so a balance change is a row edit, not a code change. That means two things for this wiki:

- **Probabilities are exact.** A 2d6 roll has the same odds in any build, so those numbers won't move.
- **Effect sizes are placeholders.** "+30% attack for 8 seconds" is a starting point that playtesting will change. When a number is a placeholder, the page says so.

## Status

PSEUDO is in active development, aiming for a Steam release. The systems pages describe the design as decided, which can run ahead of what's implemented. Where that matters, the page notes what is already in the build.
