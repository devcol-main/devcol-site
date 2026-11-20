---
title: "Health Bars for a UE5 Multiplayer Action Game: Overhead Bars Built in C++ UMG, a Boss Bar on Engage, and Per-Viewer Hiding Without Replication"
description: "How I built the first combat UI for a UE5 listen-server action RPG: overhead name and HP bars for allies, enemy players and enemies, an elite tier, a top-center boss bar that appears when the local player enters the boss's engage radius, and hide rules (5 s after damage, line of sight, distance) that each machine decides in NativeTick, with no new replication."
date: 2026-11-22
workedOn: 2026-10-23
publishAt: 2026-11-22
track: "Combat UI bars"
category: "Build Logs"
sidebar: "Overhead and Boss Bars"
image: /blog/pseudo-boss-bar-c.jpg
outline: deep
tags: [UE5, UMG, UI, Multiplayer, GAS]
---

# Health Bars for a UE5 Multiplayer Action Game: Overhead Bars Built in C++ UMG, a Boss Bar on Engage, and Per-Viewer Hiding Without Replication

PSEUDO needed health bars before it needed pretty ones: names and HP over allies and enemies, an elite that stands out, and a big bar at the top of the screen for a boss. This build log covers how I set that up in UE5 for a listen-server game, where one rule shaped everything: who sees which bar is decided on each viewer's own machine, from data that already replicates. No new RPCs, no new replicated state for visibility. If you are adding combat bars to a multiplayer project, the decisions below are the ones I'd make again.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-boss-bar-c.jpg" alt="Each machine decides which bars its own player sees, from health that already replicates." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-boss-bar-c-dark.jpg" alt="Each machine decides which bars its own player sees, from health that already replicates." loading="lazy">
</figure>

## Three kinds of bar

The first pass is a placeholder UI: plain `UUserWidget` classes whose widget trees are built in C++, with no Widget Blueprints. The styled version comes later with CommonUI. There are three widgets:

- A player overhead bar: name and HP over every player character, as a screen-space widget component bound to the `Health` and `MaxHealth` attributes.
- An enemy overhead bar: the enemy's display name, HP, and the existing groggy gauge (the stagger meter), which now gets its own row and only shows while it isn't empty.
- A boss bar at the top centre of the screen: name, a 900 px HP bar and the groggy gauge. The player controller creates it from a configurable widget class.

Enemies got two new fields in their data asset: a `DisplayName` and a `Tier` (Normal, Elite, Boss). Everything else reads from those.

## Allies, enemy players and your own bar

For players, the bar depends on who is looking:

- Allies are always shown, in green.
- Enemy players (for the arena mode later) are shown only within 5 s of their last damage, and only when no level geometry is between the camera and them.
- Your own overhead bar is off. A setting can turn it on.

There are no teams in the game yet, but the rule needs one. The player state got a replicated `TeamId` (0 for everyone today) and a static `AreAllies(A, B)` function, which is now the only place that decides who is friend or foe. A debug console variable, `pseudo.Debug.TreatPlayersAsEnemies 1`, makes every other player an enemy, so the enemy-player rules can be tested in a two-player session today.

## Deciding visibility in NativeTick, on each machine

I put the hide logic in the widgets' `NativeTick`, not in the characters. Each machine renders bars for its own viewer, so each machine can decide on its own. Health already replicates to everyone, so a widget has all it needs.

"Damage" for the 5 s rule is simply a drop in `Health` seen on this machine, timed in real time. There is no hit event or RPC behind it.

The line-of-sight check is a trace from the camera that looks only at WorldStatic and WorldDynamic objects and ignores both characters. Walls and props hide a bar; other characters standing in between don't.

One leftover I accepted for a placeholder: a screen-space widget that is off screen doesn't tick. If an enemy player loses health while they are behind you, the 5 s window starts when they come back into view.

## Elites: a wider overhead bar, not the boss bar

I had to choose where elites go. I kept them on the overhead bar, 170 px wide with a gold name, and left the top bar to one big target. Several elites can be on screen at once, and a stack of top bars would fight for the same space. Moving elites to the top bar later is a small change: one tier check in the boss bar's update and one in the enemy bar's tick.

## When does the boss bar appear?

The boss bar needs an "engaged" moment. There is no boss-arena volume in the levels yet, but bosses already pick their target with a radius rule: they engage a player inside `EngageRadius` and let go beyond `LoseTargetRadius`. I used the same radii for the bar. When the local player comes within the boss's engage radius, the bar appears, and it stays until the player is beyond the lose-target radius or the boss dies.

This is also purely local. Each player's HUD checks its own pawn against the boss, with nothing replicated. When a real arena volume exists, it can replace the radius check in one place.

The boss's overhead bar is hidden while the top bar is the one in use. That would have taken the groggy gauge with it, and the boss fight depends on watching that gauge, so the gauge moved into the boss bar. Overhead bars of any enemy also hide when the enemy is dead, and beyond 3000 cm from the camera.

## Settings and test hooks

Three values went into the project's combat settings under a UI category: the 5 s hide time, the own-bar switch, and the 3000 cm enemy bar distance. The boss bar radii are the boss's own data, so tuning a boss's engage distance also moves its bar.

For automated tests, each widget exposes a few `BlueprintCallable` probes: whether the bar is shown, the health fill, the displayed name, and which boss the top bar shows. A test can then read the UI state directly instead of taking screenshots.

## What the tests covered

On the prototype map with the enemies frozen:

| Check | Result |
|---|---|
| A minion's bar shows "Minion" and HP; a 30-damage debug hit takes the fill from 1.00 to 0.62 (50 / 80) | Pass |
| The boss bar appears when the boss is within 2000 cm, and the boss's overhead bar hides | Pass |
| The boss bar updates on damage (fill 0.82) and hides when the boss dies | Pass |
| After leaving to 5800 cm the bar stays hidden; after a reset and walking back within 1420 cm it shows again | Pass |
| Listen server and one client: each sees the other's ally bar, neither sees their own | Pass |
| With players treated as enemies, bars are hidden until a health drop, show on both machines at 3.5 s, hide again at 9.5 s | Pass |
| The same with a 600 x 600 cm wall spawned between the players: bars stay hidden after damage; wall moved away and damage again: shown | Pass |

The look itself (sizes, colours, the font, where the boss bar sits) is a placeholder and was only checked by eye.

## Taking this into your own project

- Decide bar visibility per viewer, in the widget, from replicated attributes. Most "show on damage" or "hide behind walls" rules don't need a server event.
- Give allegiance one function (`AreAllies` here) before there are teams, so arena or PvP rules plug in later without searching the UI code.
- Reuse the AI's engage radius as the boss bar trigger until you have arena volumes; it keeps the bar and the boss's behaviour in step.
- Expose small test getters on widgets. They make UI rules testable in a two-player session without reading pixels.
