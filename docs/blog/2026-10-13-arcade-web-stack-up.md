---
title: "Building Stack Up in Small Steps with a Three-Agent Loop"
description: "How the first Arcade Web game went from a single-file browser mockup to a tested TypeScript build: eight steps, a write/check/review loop with a three-attempt limit, what the reviewer caught, and what only a person could catch."
date: 2026-10-13
track: "Stack Up in eight steps"
outline: deep
---

# Building Stack Up in Small Steps with a Three-Agent Loop

[Stack Up](/projects/stack-up) is the first game in [Arcade Web](/projects/arcade-web). It started as a single HTML mockup that already ran the core loop: the sliding block, the cut, Perfect drops, combos, width regrowth, speed, the camera, and game over. The mockup even played itself. It was a good reference and a bad base, so I rebuilt it from scratch in TypeScript and kept the mockup only to look at.

## The loop

The spec was split into eight steps in a fixed order:

1. Project skeleton and the local leaderboard
2. Core rules and tests
3. Rendering: blocks, falling pieces, camera, glow sprites
4. Moving background and effects, with reduced motion
5. Synthesized sound
6. Screens: title, play, game over, nickname, Top 10
7. Resizing, pausing on a hidden tab, keyboard focus
8. The script that copies the build into this site

Each step went through the same three agents in Claude Code. One wrote the code, one ran the type check and tests, and one reviewed the diff against the spec. If the review came back with requested changes, the step went around again. After three attempts it stops and waits for me. Every run goes into a log with the attempt count and what the reviewer flagged.

Stack Up never hit the limit. Of the seven steps that went through the agents, three passed on the first try and four took two. The last step, the copy script, I checked myself.

## What the reviewer caught

Every second attempt was for a real bug:

- The first leaderboard dropped the new score if writing to `localStorage` failed. A full or blocked storage shouldn't eat the run you just finished.
- The audio step created a closure inside the per-frame loop. It worked, but it meant a new allocation on every frame.
- With the Submit or Sound button focused, pressing Space clicked the button and also triggered the game's own Space handler.
- The screen code took the concrete leaderboard class instead of the `LeaderboardService` interface, which would have made swapping in an online leaderboard later harder.

The test count went from 16 after step one to 117 at the end of step seven.

## What the tests didn't catch

Some things don't show up in a test or a diff.

The first problem was the logo. The DevCol logo is dark, so the first version flipped it for the dark background with a CSS `invert` and `hue-rotate` filter. The red hook in the logo came out a pale salmon pink. I also wanted it in the top-left corner. The fix was a separate dark-background PNG made by a small script, with the original red checked pixel by pixel, and the STACK UP text moved to the top center above the score.

The second was text showing through the options panel. The README screenshots are captured by a bot (more on that below), and the options screenshot showed the title text bleeding through the panel and overlapping the "Reduced motion" row. That became its own small fix: hide the screen behind the panel while it's open.

The rest was about feel. After playing it I asked for a second round: background music, a square wave on Perfect instead of a round ring, a bigger PERFECT label, a slightly wider Perfect tolerance, floor milestones at 5, 10, and every 10 after, a best score on the HUD, and an options panel. The Perfect tolerance ended up at 4.5% of the block's width with a small floor so thin blocks still have some room.

## The capture bot

The README GIF and screenshots aren't recorded by hand. A script starts headless Chrome, loads the game, and lets a small bot play a seeded run while frames are captured and turned into a GIF with ffmpeg. Because the rules only depend on the seed and the inputs, seed 7 always ends the same way: 61 points, 15 floors, best combo 11. The bot hook only exists in development builds, and the build check fails if it shows up in production.

The spec had guessed 8 to 10 seconds for the GIF, and the first one came out at about 11. I changed the target to 20 to 25 seconds. The final one is 22.7 seconds and includes the floor 10 milestone, width regrowth at combo 5 and 10, and the camera climbing.

## Where it ended

The build is 124 KB with the font and logo included, and there are no audio files. All the sound is synthesized. You can [play it here](/projects/stack-up).

The next day I started the second game, Bug Squash, in the same repository. [That one went less smoothly](./2026-10-14-arcade-web-bug-squash-terminal-redesign).
