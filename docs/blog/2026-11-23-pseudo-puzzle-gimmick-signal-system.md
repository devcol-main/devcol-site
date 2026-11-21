---
title: "A Puzzle Kit for a UE5 Multiplayer Game: Boolean Signals, Soft Actor References, Server-Clock Doors and Hittable Puzzle Pieces Without an Ability System"
description: "How I built levers, pressure plates, shot targets and breakable walls for a UE5 listen-server action game: one replicated SaveGame boolean per gimmick, logic actors (All, Any, Sequence, Timed) wired with TSoftObjectPtr on the consuming side, doors and bridges posed from GetServerWorldTimeSeconds instead of replicated movement, a world hit target interface that reuses the real hit validation, and solved puzzles that survive save, load and checkpoint retry."
date: 2026-11-23
workedOn: 2026-10-23
publishAt: 2026-11-23
track: "Puzzle gimmick kit"
category: "Build Logs"
sidebar: "Puzzle Gimmick Kit"
image: /blog/pseudo-gimmick-kit-c.jpg
outline: deep
tags: [UE5, Multiplayer, Level Design, SaveGame, Architecture]
---

# A Puzzle Kit for a UE5 Multiplayer Game: Boolean Signals, Soft Actor References, Server-Clock Doors and Hittable Puzzle Pieces Without an Ability System

PSEUDO needed environmental puzzles: break a wall to reach a lever, light three runes before a timer runs out, strike symbols in the right order. This build log is about the kit underneath them, a small signal system in C++ where every puzzle piece has one boolean output. If you are building something similar for a networked UE5 game, the parts worth taking are how pieces are linked (soft references, set on the consuming side), how doors move on clients without replicating movement (a server timestamp and the server clock), how puzzle pieces take hits from the real combat code without an ability system, and why a solved puzzle has to autosave.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-gimmick-kit-c.jpg" alt="Every puzzle piece has one replicated, saved boolean; logic and doors read it." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-gimmick-kit-c-dark.jpg" alt="Every puzzle piece has one replicated, saved boolean; logic and doors read it." loading="lazy">
</figure>

## Senders, logic and receivers

The kit has three roles, all deriving from one base actor:

- Senders turn something the player does into a signal: a lever (the interact button), a pressure plate (overlap), a shot target (a ranged hit, optionally melee) and a breakable wall (melee and area hits).
- Logic combines inputs. One logic actor has four modes: All, Any, Sequence and Timed, plus optional reset inputs, a latch, a world flag to set when solved, and an optional display.
- Receivers do something when their input turns on. There is one mover class that blends from a start pose to an active pose; the door, the moving platform and the drawbridge are subclasses that only change defaults.

The whole signal is a single `bActive` boolean per gimmick. Only the server writes it, it replicates (the actors are always relevant), and it is a `SaveGame` property. I considered richer outputs and didn't need them: one boolean is enough for AND, OR, order and timers, and it gives exactly one thing to save and one thing to look at when debugging.

Having one mover class and making the variants data means there is one movement code path to get right. A door, a platform and a bridge differ only in their offset, rotation, move time and whether they loop.

## Wiring with soft references on the consuming side

Links are `TSoftObjectPtr<APseudoGimmick>` arrays, set per placed instance, and they live on the side that reads: a logic actor lists its `Inputs` and `ResetInputs`, a door lists the logic it listens to. Senders don't know who uses them.

This choice had a few practical reasons. Soft references work across sublevels. The Details panel gives an actor picker for them. And for the Sequence mode, the order of the `Inputs` array is the order of the solution, so nothing else has to encode it. I checked that the references resolve in both the server and the client PIE worlds.

## Doors that move from the server clock

Replicating the movement of every door and bridge would have been the default, and I didn't want it. Instead, when a receiver's input changes, the server stores two replicated values: the time of the change on the server clock, and the blend alpha at that moment. Every machine then computes the current pose itself from `GetServerWorldTimeSeconds()`.

That gives smooth motion on clients without any movement replication. It also means a late joiner, or a client loading a save, sees the end pose at once: the change time is far in the past, so the computed alpha is already 1. In the test, the looping lift platform read z 54 on the server and z 51 on the client at the same moment. Riding a platform on a client depends on the client's estimate of the server time, so small corrections are possible.

## Puzzle pieces in the real hit pipeline

A breakable wall or a shot target has to be hit by the same attacks that hit enemies: the client's melee trace, area attacks and hitscan shots, each re-checked on the server. I didn't want to give every puzzle piece an ability system component just so it could be hit.

So puzzle pieces implement a small interface, `IPseudoWorldHitTarget`, and carry a query-only hit box on the Pawn object channel so the existing traces find them. The hit pipeline got a branch in each place that finds or validates a target (the shot trace and its server check, the melee trace task and the combo's server check, area target search and its check, and melee hit application). When the target is a world hit target, it gets the hit through the interface instead of a gameplay effect. The server validation is the same as for enemies, so a client's hit on a wall is checked like any other hit. In the test, one duplicate hit was rejected with "already hit by this attack", the same rule enemies get. Enemies never hit gimmicks; only player attackers do.

Wall strength is counted in hits (3 to break, an area hit counts as 2), not health. Weapon damage was still being tuned, and I didn't want puzzles to change every time it was.

## Levels, edges and the decoy that wasn't heard

All and Any read the current level of their inputs. Sequence and Timed react to an input turning on. They have to: when one of them fails, it resets its own inputs, and a level-reading logic would see those resets as moves.

The third test puzzle has six symbol faces and a fixed sequence, 3-1-5-2, shown on the door as a dice "roll" after a 1.5 s delay and after every failure. Faces 4 and 6 are decoys. My first version only listened to the faces in the sequence, so striking a decoy did nothing at all. The fix was to list decoys as `ResetInputs` (turning one on fails the attempt) and to make a failure reset both the inputs and the reset inputs. With that, a "Reset" logic mode was unnecessary: reset levers, reset plates and decoys are all just reset inputs.

The Timed window uses a world timer on game time. It is a world puzzle, not a player action, so a world slow motion stretches the window; I accepted that.

## Solved stays solved, even after a retry

Solved logic latches by default. The tricky part was the checkpoint retry. A retry reloads the last save, so a puzzle solved after the last checkpoint would close again on retry. Solving a puzzle now autosaves at the current respawn checkpoint. Partial progress is not saved at all: an unsolved Sequence or Timed logic resets its inputs on `BeginPlay`, because a half-lit timed puzzle with no running timer would be stuck forever. How the save itself works is in the [save, load and checkpoint build log](./2026-11-22-pseudo-save-load-checkpoints-listen-server).

A solved puzzle can also set a world flag, which quests and NPC lines can read later.

Levers have one exception to the normal interact rule. Interacting is normally blocked within 1000 cm of a living enemy, but puzzles near fights should still work, so levers allow it by default (`bAllowInCombat`), per lever.

## What the tests showed

All tests ran as a listen server with one client:

- The client solved the first puzzle alone: three greatsword hits broke the wall, the lever opened the door, the autosave ran and the world flag was set; the door pose matched on both worlds. The host solved it again after a reset.
- The pressure plate and lift worked from the client, on and off, on both machines.
- The client lit three runes with pistol shots within the 6 s window, with 0 server rejections, and the door and bridge opened on both worlds. Letting the timer run out reset the runes on both.
- A wrong order reset the sequence, and so did striking a decoy (after the decoy fix). Host and client each solved 3-1-5-2, with sword strikes and with pistols.
- Every sender type was triggered by the client at least once.
- After a full load from disk, all three puzzles were still solved, with doors and bridge at their end pose on both worlds at once. After a checkpoint retry, the autosaved puzzle stayed solved.

Still open: no sound or effects on hits, failures or solves; the lever handle snaps instead of animating; shot targets accept hitscan only (projectile ammo ignores the hit box); heavy attacks don't break walls faster; and a sequence can't repeat a symbol that is also a decoy.

## Taking the pattern into your project

- One replicated, saved boolean per puzzle piece is enough for most puzzle logic, and it is easy to debug.
- Put links on the consuming side as soft actor references. The array order can carry meaning (a sequence), and senders stay reusable.
- For doors and platforms, replicate "when it changed" and "where it was" instead of the movement, and compute the pose from the server clock on every machine.
- Let puzzle pieces join your existing hit validation through a small interface rather than giving them an ability system.
- Decide edge versus level per logic type: anything that resets its own inputs must react to edges.
- If you have checkpoint retries that reload a save, autosave on solve, and don't save half-finished timed puzzles.
