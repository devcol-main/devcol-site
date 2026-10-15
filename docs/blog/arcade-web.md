---
title: "Arcade Web"
description: "Overview of Arcade Web, DevCol's small browser games built with TypeScript, Canvas 2D, and WebAudio: the games, how they're built, and where every DevLog lives."
outline: deep
---

# Arcade Web

Arcade Web is a set of small arcade games that run in the browser here on devcol.net. They're built with TypeScript, Canvas 2D, and WebAudio, with no game engine, no framework, and no audio files. Each game has its own repository and its own look and sound.

The games, with rules, scoring, and a playable frame, are on the project pages:

- [Stack Up](/projects/stack-up): one button, stack the blocks, whatever overhangs gets cut off
- [Bug Squash](/projects/bug-squash): whack-a-mole in a retro terminal

The [Arcade Web project page](/projects/arcade-web) covers how the repositories, the shared leaderboard format, and the player profile fit together. This page collects the development notes.

## How they're built

Each game is developed from a numbered task spec with Claude Code. The spec is split into small steps in a fixed order: core rules and tests first, then rendering, effects and sound, screens, and polish. For each step one agent writes the code, one runs the type check and tests, and one reviews the diff against the spec. A step gets three attempts, and then it stops and waits for me. Every step is logged with its attempt count and what the review sent back.

The rules of each game sit in a plain TypeScript core with a seeded random generator, so the same seed and the same inputs always replay the same run. That's what the tests are built on, and it's also how the README GIFs are recorded: a bot plays a seeded run in headless Chrome.

## Reading order

1. [Building Stack Up in Small Steps with a Three-Agent Loop](./2026-10-13-arcade-web-stack-up)
2. [Bug Squash: Rebuilding a Neon Copy as a Retro Terminal](./2026-10-14-arcade-web-bug-squash-terminal-redesign)
3. [Moving Each Arcade Web Game into Its Own Repository](./2026-10-15-arcade-web-one-repo-per-game)

## What's next

A ranking across games built on the shared player profile, an online leaderboard behind the interface the games already use, a daily challenge on a shared seed, and more games.
