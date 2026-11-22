---
title: "Save, Load and Checkpoint Retry for a UE5 Listen-Server Game: USaveGame, a Game Instance Subsystem, SaveGame Properties and a Run That Survives ServerTravel"
description: "How I built saving for a UE5 action RPG that is always a listen server, even in single player: three copies of the run (live, retry point, disk), restore points in the GameMode (InitGameState, StartPlay, FinishRestartPlayer), placed and spawned actors saved with UPROPERTY(SaveGame) and ArIsSaveGame, per-player keys for clients, world-state gameplay tags, and a checkpoint retry that never reads the disk."
date: 2026-11-22
workedOn: 2026-10-23
publishAt: 2026-11-22
track: "Save and checkpoints"
category: "Build Logs"
sidebar: "Save, Load and Retry"
image: /blog/pseudo-save-retry-c.jpg
outline: deep
tags: [UE5, SaveGame, Multiplayer, GAS, Architecture]
---

# Save, Load and Checkpoint Retry for a UE5 Listen-Server Game: USaveGame, a Game Instance Subsystem, SaveGame Properties and a Run That Survives ServerTravel

PSEUDO runs every session as a listen server, single player included, so saving had to answer questions a single-player game never asks: who writes the file, how a client's progress is found again, and what happens to progress when the server travels to the next map. This build log covers the design I ended up with: a game instance subsystem that keeps three copies of the run, restore points in the game mode chosen by when each kind of object exists, and actor state saved through `UPROPERTY(SaveGame)`. The shape follows the Sample-PersistenceLab sample project, which I read for its architecture only; nothing was imported, and there are no plugins, Mass or level streaming persistence involved.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-save-retry-c.jpg" alt="The run lives in memory across travel; a retry loads its own copy, never the disk." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-save-retry-c-dark.jpg" alt="The run lives in memory across travel; a retry loads its own copy, never the disk." loading="lazy">
</figure>

## What one save holds

The save is a versioned `USaveGame` subclass with a `Migrate()` step for format changes. Per player it stores level, XP, skill points, learned skill tree nodes, every owned unlock tag (dice types, ammo, movement), dice pips and the "first roll" flag, weapon slots and the drawn slot, special ammo stocks, the face choice, and an empty, versioned inventory section ready for later. For the world it stores world-state flags, the saveable actors of each level, the map and checkpoint to continue from, and a run number and seed.

A second, separate meta save survives New Game: how many runs were started, which endings were seen, the ending choices, and the seed history. Settings and key bindings are in neither; they belong to the player, not to a playthrough.

A few things deliberately start fresh on every load: health, the dice bad-luck stack and the Reversal challenge. The stack is a gameplay effect, and rebuilding it wasn't worth it yet.

## Why the run exists three times

The save subsystem (a `UGameInstanceSubsystem`) keeps three copies:

| Copy | What it is | Why |
|---|---|---|
| Live | The run right now | Travel needs the run in memory every time |
| Retry point | The last save, or the state on arrival in the map | A retry must not read the disk |
| Disk slot | The file | Continue after quitting |

The Live copy fixed a bug that existed before saving did. The game uses non-seamless `ServerTravel`, which recreates every player state, so progress made in the hub was lost on entering Stage 1. Now the game mode's travel function captures the world into Live before `ServerTravel` when the run should carry over, and the next map restores from it. Travel to the menu, loading a save and retrying pass a flag that skips the capture.

The retry point exists because a retry shouldn't wait on an async disk read, and because the "state on arrival" is never written to disk at all. A map with no checkpoint still has something to retry from.

## Restoring at the moment each thing exists

The hardest part was timing. Each kind of state is restored at the earliest point where its owner exists:

- World flags in `InitGameState`, since they live on the game state.
- Placed level actors in `StartPlay`, before calling `Super`, so their `BeginPlay` already sees the loaded values.
- Players in `FinishRestartPlayer`, once per player state.

That order caused one bug that tests caught: on the host, the restore runs before the player's own `BeginPlay`, and a server-side initialiser in `BeginPlay` reset the restored skill points after a retry. The rule since then is that server `BeginPlay` code only fills defaults, for example `TotalSP = Max(TotalSP, StartingSP)`, and never overwrites a value.

## Saving actors with SaveGame properties

Gimmicks and other level actors opt in through a C++ interface with three hooks: `OnPreSave`, `OnSaveLoaded` and `ShouldSaveTransform`. Their state is marked `UPROPERTY(SaveGame)`, which can also be a replicated property. Serialisation is the engine's own: `Actor->Serialize` with an archive that has `ArIsSaveGame` set writes only the actor's SaveGame properties, tagged. Component state has to be copied into actor properties to be saved.

Actors need stable ids. For placed actors (`IsNetStartupActor`) the id is the actor's name in the level, and destroyed placed actors are recorded, so a breakable wall stays broken. Spawned actors are saved as class plus transform and spawned again on load. A placed actor that gets renamed after a save exists is skipped with a warning; a GUID property can replace names if that becomes a problem. (A spawned actor only gets back what is marked `SaveGame`: the [inventory build log](./2026-11-24-pseudo-inventory-playerstate-replicated-saved) has a dropped pickup that returned with no item for exactly that reason.)

`OnSaveLoaded` runs on the server before `BeginPlay`, so it re-applies visuals and collision there, and clients get the values through normal replication.

Story and quest facts don't need an actor at all. A world-state subsystem holds gameplay tags under `World.*` in a replicated tag container on the game state: `SetFlag` on the server, `HasFlag` anywhere, and an `OnFlagChanged` event. Flags travel with the run and are saved with it.

## Who writes, and whose record is whose

Only a server world writes, and only when its game mode has `bAllowSaving` on. Clients never write a save; their subsystem stays idle. An arena game mode turns saving off and ragdolls on, which was mostly needed to test the flag.

The host saves every player's progress, which raises the question of how to find a client's record again. The host is stored as "Host". Clients are stored by unique net id. If no exact id matches, the first unclaimed client record is used and re-keyed, in join order. That fallback exists because with the NULL online subsystem in PIE the ids change every session; Steam ids are stable. The known gap: with the NULL subsystem, two clients rejoining in a different order could swap records.

## Checkpoints, death and retry

A checkpoint actor activates once on overlap (and saves if it is new) or saves every time through Interact ("Rest (save)"). It becomes the respawn point: players appear 150 cm in front of it, 120 cm apart, at full health. Autosaves also happen on arrival in the hub and on a stage clear.

Death waits `RetryDelay` (4 s) and then branches:

- If anyone is still standing, or in the arena, only the dead player respawns at the checkpoint (or the player start), with their weapons and stocks. A co-op partner isn't punished for one death.
- If everyone is down, the game retries: it loads the retry point and travels the session to that map. Retry is the same path as loading a checkpoint save, so there is one tested path, not two.

The main menu shows STORY as New Game directly when there is no save, and CONTINUE / NEW GAME / BACK when there is one. New Game deletes the game slot and keeps the meta save.

## What the tests showed

All in PIE with a listen server and one client:

- Saving at the Stage 1 checkpoint wrote both players' level, nodes, unlocks, ammo and face, a placed test actor's counter and a spawned one's.
- Quit to menu and Continue restored all of it, on the right spot, with world flags on the client too. The spawned test actor came back once, with no duplicate.
- After the save, extra XP, a changed counter and a new flag, then killing both players: retry travelled back and restored exactly the checkpoint state, positions included. With only the host dead, it respawned after 4 s with no reload.
- New Game reset the game save, kept the meta save, and progress made in the hub carried into Stage 1 through portal travel.
- In the arena game mode nothing was restored and a save request was refused.
- The client's progress was saved by the host, came back after rejoining (re-keyed by join order), and the client could not start a New Game itself.

Still open: per-player keys with Steam ids, a save slot screen (only slot 0 is used), healing at checkpoints, a stage-cleared flag per stage, and the retry delay running in game time, so a slow-motion effect at death would stretch it.

## If you are building saving for a multiplayer UE5 game

- Keep the run in a game instance subsystem and capture it before every `ServerTravel` that should carry progress. Non-seamless travel recreates player states.
- Restore each kind of state where its owner first exists, and make server `BeginPlay` initialisers fill defaults only.
- Let actors opt in with `UPROPERTY(SaveGame)` and an `ArIsSaveGame` archive; use names for placed actors and class plus transform for spawned ones.
- Decide who writes (the server) and how a client's record is matched again before the first save ships, especially if your PIE ids change every session.
