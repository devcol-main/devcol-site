---
title: "NPC Dialogue and a Side Quest in UE5 With No Quest Component: Data Asset Dialogue Trees, Gameplay Tag World Flags and a Consequence You See Next Visit"
description: "How I built NPC dialogue and a branching side quest for a UE5 listen-server action game: dialogue as a primary data asset with flag conditions and effects, rules on the server and a CommonUI widget that only renders, quest state stored entirely in replicated, saved gameplay-tag world flags, quest events routed through one subsystem, a delayed consequence applied at the next map start, and player behaviour counters kept in a separate meta save."
date: 2026-11-23
workedOn: 2026-10-23
publishAt: 2026-11-23
track: "Dialogue and side quest"
category: "Build Logs"
sidebar: "Dialogue and Side Quest"
image: /blog/pseudo-quest-flags-c.jpg
outline: deep
tags: [UE5, Dialogue, Quests, Gameplay Tags, SaveGame, Multiplayer, CommonUI]
---

# NPC Dialogue and a Side Quest in UE5 With No Quest Component: Data Asset Dialogue Trees, Gameplay Tag World Flags and a Consequence You See Next Visit

PSEUDO's hub needed people to talk to and one side quest that remembers what you did. This build log describes the smallest version I could make that still branches, survives saves and works with a client connected. The idea that carried most of it: a quest has no state of its own. Its state is a handful of world flags (gameplay tags) that already replicate, travel with the server, get saved and can be read by any dialogue line. If you are adding dialogue and simple quests to a UE5 game, this shows how far that gets you and where it stops.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-quest-flags-c.jpg" alt="The quest keeps no state of its own: it is a few world flags that already save and replicate." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-quest-flags-c-dark.jpg" alt="The quest keeps no state of its own: it is a few world flags that already save and replicate." loading="lazy">
</figure>

## The quest the system had to carry

The test case is a small quest called "Lost Signal". An NPC in the hub, the Archivist, offers it. A second NPC, Echo, appears in a corner of the hub. You talk to it, which completes the first objective, and then you either spare it (through the dialogue) or kill it (two hits). Right after, the Archivist only says there's no news yet. Leave the hub and come back, and the outcome shows: if you spared Echo, it lives next to the Archivist and the Archivist thanks you; if you killed it, a "Broken Signal" stands where Echo was and the Archivist knows what you did.

That single quest needs conditions, choices with effects, a kill path, a delayed consequence and saving.

## Dialogue as a data asset

A dialogue is a primary data asset with three kinds of entry:

- Entries pick the start node: the first entry whose condition holds wins. That is how an NPC says something different after the quest.
- Nodes have an id, a speaker, a localizable `FText` line, a condition, effects, choices, a next node and an optional glitch look.
- Choices have text, a condition, effects and a next node.

Conditions are two lists of world flags, required and blocked. Effects can set or clear flags, start a quest, or send a quest event. Everything an NPC does in conversation is data, and the asset class implements data validation for the editor.

The NPC actor itself is a greybox capsule with a head and a name label. It implements the existing interact interface (the one from the [interaction and travel build log](./2026-11-19-pseudo-interact-portal-server-travel)), the saveable interface, and, for killable NPCs, the same world hit target interface puzzle pieces use (see the [puzzle kit build log](./2026-11-23-pseudo-puzzle-gimmick-signal-system)). Echo dies after two player hits that go through the normal client trace and server validation. Each NPC also has a presence condition: it exists in the world only while its flags say so.

## Rules on the server, a widget that only draws

All dialogue state and every rule live in a dialogue component on the NPC, on the server. The widget renders the current node and asks the component to `Advance` or `Choose`. The component re-checks each request: is this the player who is talking, is this still the current node, was this choice actually offered.

The widget is a CommonUI activatable screen with the same menu input mode as the settings screen ([settings and key remapping build log](./2026-11-22-pseudo-settings-menu-key-remapping-commonui)). It takes mouse clicks and pad or keyboard navigation: up and down to move, A, Enter or Space to confirm, B, Esc or Backspace to close. One bug came up in testing: a mouse click outside the box took the focus away, and then B no longer closed it. The widget now takes the focus back.

## One rule for multiplayer: only the host talks

The game always runs as a listen server, even solo, and dialogue had to be safe with a client connected without becoming a multiplayer feature yet. The rule: only a player who is locally controlled on the authority can talk, which means the listen host or the solo player. A client gets no interact prompt for NPCs (the check fails on both machines), and a forced request is refused on the server with a log line.

Everything else works for clients. The world flags replicate, so the client's quest log line shows the quest, NPC presence matches, and a client can kill Echo. In the test, the client killed Echo with real attacks, the quest finished, and both players got the 100 XP reward.

Because the shape is already "rules on the server, widget asks", letting clients talk later means adding two RPCs on the player controller: one to show a node, one to send a choice.

## Quest state is only world flags

I didn't make a quest component or keep runtime arrays of objectives. A quest data asset lists an active flag, a done flag per objective and a result flag per outcome. Starting the quest sets the active flag; finishing an objective sets its done flag; an outcome sets its result flag.

World flags already did everything a quest needs: they replicate, survive server travel, are saved and restored on retry and on Continue, and dialogue conditions read them. So the quest got all of that for free. The cost is that counted objectives ("kill 3") don't fit; a flag counts to one. That is noted as future work.

## Quest events: one entry point

Objectives complete on quest events: a gameplay tag under `Event.Quest.*` plus a target id, sent to `SendQuestEvent` on a server subsystem. There are four kinds:

| Event | Sent when | Target id |
|---|---|---|
| Kill | An enemy or NPC dies | The enemy's data asset name, or the NPC id |
| Talk | A dialogue starts | The NPC id |
| Dialogue | A choice with that effect is picked | The choice's id |
| Item | Reserved for the inventory | |

The kill event didn't need a new hook. The XP path already receives a kill event on the progression component, so it forwards it. Neither NPCs nor the world need an ability system to send quest events.

The spare branch puts its effect on the last choice of Echo's dialogue, not on an earlier one. Echo's presence ends when its flags change, which closes the dialogue, so the effect has to come after the line the player should still see.

## A consequence that waits for the next visit

Each outcome can list delayed flags. These are set at the next map start, on the server, after the save has restored the flags, for every finished quest. Setting a flag twice changes nothing, so this needs no extra saved state: travel, a checkpoint retry and Continue all count as "came back". In the test, travelling to the first stage and back to the hub put the settled Echo next to the Archivist (spared), or the Broken Signal in Echo's corner (killed), each with the matching Archivist line.

The quest is hidden by presence conditions rather than destroyed. Killed Echo just stops being present, so resetting the quest brings it back with nothing else to save.

## Remembering how the player behaves

Later NPC lines are meant to react to how the player plays, not only to quests. I split that across two saves:

- In the run (world flags): `World.Behavior.Spared`, `World.Behavior.Killed`, `World.Behavior.RolledALot`, and the ending choice. This run's NPC lines read these.
- In the meta save, which survives New Game: every behaviour flag ever set (written at once), and a total dice roll counter.

The run's dice roll count lives in the game save, so a retry or a Continue rolls it back too. When it reaches a threshold (20, a project setting, re-rolls not counted), the run gets "rolled a lot", and one NPC has a line for it. The save format gained only new fields, so old saves load with them empty and the version wasn't bumped.

One NPC also tests a story beat. When an Act 2 flag is set, its first entry plays the same line three times, the last one cut off, in a red, flickering "glitch" style. Nothing in the game sets that flag yet; a cheat does.

## Tested, and what's left

In PIE: both branches played with real input (interact and dialogue for spare, two light attacks for kill), each finishing the quest with the right flags, the XP reward and an autosave. The delayed consequence appeared only after leaving and re-entering the hub. Saving, going to the menu and pressing Continue restored the spared state; loading restored the killed state. The glitch lines played with the flag and normal lines without it. Pad and mouse both drove the dialogue. With a client connected, the host's dialogue worked, the client's forced dialogue was refused, and the client's kill finished the quest for both players.

Not done yet: clients talking, counted and item objectives, a quest tab in the menu, quest markers, and a story beat that sets the Act 2 flag. Name labels are ASCII for now because the engine's text render font has no Hangul glyphs. Dialogue doesn't pause the game or stop enemies; the hub has none. And because quest events are world events, a client's kill counts for the whole session, which is fine for co-op.

## If you're adding dialogue to your own game

- Try storing quest state in flags you already save and replicate before you build a quest system. One-step objectives and branches fit; counters don't.
- Keep dialogue rules and state on the server and let the widget only draw and ask, even for a single-player feature. Multiplayer is then a matter of two RPCs.
- Route every quest-relevant happening through one server entry point with a tag and an id.
- For "the world changed while you were away", set delayed flags at the next map start. If setting them twice is harmless, you don't need to store whether you already did.
- Put the effect that removes an NPC on the last line the player should see.
- Keep long-term behaviour (across runs) in a separate meta save from the current run's state.
