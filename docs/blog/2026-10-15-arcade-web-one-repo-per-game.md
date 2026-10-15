---
title: "Moving Each Arcade Web Game into Its Own Repository"
description: "Stack Up and Bug Squash started in one shared repository. Notes on splitting each into its own repo with history intact, checking the split by tree hash, what stayed shared, and how a build gets onto devcol.net."
date: 2026-10-15
track: "One repository per game"
outline: deep
---

# Moving Each Arcade Web Game into Its Own Repository

[Stack Up](./2026-10-13-arcade-web-stack-up) and [Bug Squash](./2026-10-14-arcade-web-bug-squash-terminal-redesign) were both built in one repository, `Arcade-Web`, with the games under `games/` and the code they share under `shared/`. On the third day I moved each game into its own public repository. Arcade-Web is now just the entry point and the reference copy of the shared formats.

## Keeping the history

The history came along with the code. `git subtree split` takes one folder and rewrites its history as if that folder had always been the repository root. Bug Squash came out with 19 commits and Stack Up with 18, each followed by one commit that sets it up to stand on its own: build and test config, scripts, CI, license, README.

To check that nothing was lost or changed on the way, I compared tree hashes. The tree of the last commit from the split has to be the same object as the `games/<name>` tree on Arcade-Web's `main`. For Bug Squash that was `62ae79a` on both sides, and for Stack Up `dcb1bf0`. Same hash, same files, byte for byte.

Only after that was the game deleted from Arcade-Web, so the code doesn't live in two places and drift apart. The task specs for each game were copied into the new repository as a record, with a note at the top that paths in them refer to the old layout.

## What stays shared

Each game needed its own copy of the shared code, so the leaderboard and player profile modules were copied into the game's `src/shared/`. Stack Up doesn't use the cross-game ranking module, so it didn't get one.

The part that can't change is the storage format. Both games are served from devcol.net, so at runtime they read the same `localStorage`. The player ID and nickname live under the same keys in both, and each game's leaderboard stays under its own key. If one game's copy of the profile code changed how it writes those keys, the other game would break. So the copies are free to diverge in code but not in format, and Arcade-Web keeps the reference version of that format.

## The same checks everywhere

Every repository runs the same CI on each pull request and on `main`: install, type check and tests, build, and a build check script. The build check fails if the bundle is over 300 KB or if a development-only hook (like the one the capture bot uses to play the game) made it into the production files. When that check was first added, it was run against the cases it should fail on: a fake bundle with the hook string in it, a 400 KB file, and an empty `dist` folder.

After the split, Bug Squash had 469 tests and Arcade-Web was left with 42, all for the shared code.

## Two sessions in one folder

Something went wrong the day before the split. Two Claude Code sessions were working in the same checkout of Arcade-Web at once, one on a Bug Squash task and one on a Stack Up fix, and their branches got mixed up. The Stack Up fix was moved to a separate `git worktree` and finished there. Now that each game has its own repository, two sessions on two different games can't end up in the same folder.

## Getting a game onto the site

The site is static, so a game is just files. Each game builds to `dist/` with relative paths and no CDN. A `copy-to-site.sh` script copies that folder into this site's repository under `docs/public/games/<name>/`, and the project page embeds it in a frame. Updating a game is: change it, build it, run the copy script, commit the site.

Both games are live on their project pages now: [Stack Up](/projects/stack-up) and [Bug Squash](/projects/bug-squash).
