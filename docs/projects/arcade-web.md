---
title: Arcade Web
description: "Small browser games built with TypeScript, Canvas 2D, and WebAudio, with no engine and no audio files. Stack Up and Bug Squash, and how they fit together."
outline: deep
---

# Arcade Web

*TypeScript, Canvas 2D, WebAudio, Vite* · [GitHub: Arcade-Web](https://github.com/devcol-main/Arcade-Web)

Arcade Web is a set of small games that run right here on devcol.net. Each one is a short arcade game you can finish in a minute or two, on a phone or a desktop, with nothing to install.

They're built without a game engine or a framework. Rendering is Canvas 2D, every sound is synthesized with WebAudio, and each build ships its own font and assets with no CDN, which keeps a whole game between roughly 120 and 170 KB.

## The games

| Game | What it is | Play |
|---|---|---|
| **Stack Up** | One button. A block slides back and forth, you tap to drop it, and whatever overhangs the tower gets sliced off. | [Play Stack Up](/projects/stack-up) |
| **Bug Squash** | Whack-a-mole in a retro terminal. Squash bugs before they hide, and don't touch the working features. | [Play Bug Squash](/projects/bug-squash) |

![Stack Up gameplay: a neon tower with a PERFECT combo popup](/projects/stack-up-gameplay.png){width=240} ![Bug Squash gameplay: beetles and a gear in a green terminal grid](/projects/bug-squash-gameplay.png){width=240}

## One look per game

Bug Squash started out with Stack Up's neon style and synth sound. It played fine, but it felt like an extra Stack Up level, so it was rebuilt from the ground up as a retro terminal with its own colors, font, effects, and chiptune soundtrack. Since then the rule is that every game in Arcade Web gets a concept of its own and doesn't reuse another game's look or sound.

## How the repositories fit together

Each game lives in its own repository:

- [Stack-Up](https://github.com/devcol-main/Stack-Up)
- [Bug-Squash](https://github.com/devcol-main/Bug-Squash)
- [Arcade-Web](https://github.com/devcol-main/Arcade-Web) is the entry point. It lists the games and holds the reference copy of the formats they share.

Two of those shared formats are copied into every game:

- **Leaderboard.** Each game keeps its own local Top 10 behind a `LeaderboardService` interface, with stats that fit the game (floors and best combo for Stack Up; bugs squashed, best combo, and time survived for Bug Squash). The game only talks to the interface, so a server can replace browser storage later without touching game code.
- **Player profile.** One random player ID and one nickname, shared by every game on the site. Type your name once in Stack Up and Bug Squash already knows it.

Because all the games are served from the same domain, they can read that shared profile. That's also the groundwork for a ranking across games, which is the next thing on the list.

## Getting a game onto the site

The site is static, so a game is just files. Each game repository builds to a `dist` folder with relative paths, checks the bundle against a 300 KB limit, and a script copies it into the site under `/games/<name>/`. The project page then embeds it in a frame and links to the same file for full-screen play. There is no server and no extra hosting.

## How it's built

The games are developed spec-first with Claude Code. Each change starts as a numbered task spec with a checklist. The work is split into small steps in a fixed order (core rules and tests first, then rendering, effects and audio, UI, and polish), and for each step one agent writes the code, another runs the type check and tests, and a third reviews the diff against the spec.

There are hard limits on that loop: three attempts per step, and after that the work stops and waits for a person. Every step is logged with its attempt count and the review findings that sent it back. Things a test can't judge, like how a drop feels, how loud the music sits, or how it plays on a real phone, are listed at the end of each task to check by hand.

The rules of each game sit in a pure TypeScript core with a seeded random generator, so the same seed and inputs always replay the same run. That makes the rules testable, and it's also how the gameplay GIFs are recorded: a small bot plays a seeded run in headless Chrome.

## What's next

- A ranking across games, built on the shared player profile
- An online leaderboard behind the same interface the games already use
- A daily challenge, using the seeded core so everyone gets the same run
- More games, each with its own concept

Scores stay in your browser. The games store your nickname, a random player ID, and your scores locally and send nothing anywhere. See the [Privacy Policy](/privacy-policy) for details.
