---
title: "A Server-Validated Skill Tree in UE5 GAS: XP From Kills, Level Growth Effects, Four Node Types and a Clean Respec"
description: "How I built level-ups and a skill tree on the player state in Unreal Engine 5 with the Gameplay Ability System: XP from a kill event, stat growth as one replaced SetByCaller effect, learning checked by one function shared by the UI and the server, Passive / Unlock / Augment / Active nodes as effects, replicated loose tags and granted abilities, and a respec that removes all of it."
date: 2026-11-16
workedOn: 2026-10-21
publishAt: 2026-11-16
track: "Progression and skill tree"
category: "Build Logs"
sidebar: "Skill Tree and Progression"
image: /blog/pseudo-skill-tree-c.jpg
outline: deep
tags: [UE5, GAS, Progression, UI, Multiplayer, C++]
---

# A Server-Validated Skill Tree in UE5 GAS: XP From Kills, Level Growth Effects, Four Node Types and a Clean Respec

This is the build log of PSEUDO's progression: experience from kills, levels that raise the base stats on their own, skill points, and a skill tree you spend them in. If you're putting a skill tree on top of the Gameplay Ability System in a game that might be played online, keep a single "why can't I learn this?" function that both the menu and the server call. Also give every node type a GAS representation that can be removed again as easily as it was added (an effect, a loose tag or an ability spec), so a respec is just the reverse of learning.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-skill-tree-c.jpg" alt="Menu and server share one learn check, and respec undoes each node type." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-skill-tree-c-dark.jpg" alt="Menu and server share one learn check, and respec undoes each node type." loading="lazy">
</figure>

The design side, meaning which trees exist, what each node type is for, and why nodes are saved by gameplay tag, is on the wiki's [Skill Tree](/wiki/pseudo/systems/skill-tree) and [Stats and Level](/wiki/pseudo/systems/stats-and-level) pages. This is how it was put together.

## Scope I set before starting

This is progression for the single-player story only. A later multiplayer arena gets its own progression data, its own save slot and its own rules, so the progression component reads exactly one data asset and never has to ask which mode it's in. Everything is server authoritative: the server grants XP, decides level-ups and approves every skill point spent. Save and load, level-up effects and skill moves that add new combo entries were left out of this first version.

## Where the state lives

Both new components sit on the **player state**, next to the ability system component, not on the pawn. That way progression survives the pawn dying and respawning.

- `UPseudoProgressionComponent` replicates `Level`, `XP`, `TotalSP` and `SpentSP`.
- `UPseudoSkillTreeComponent` replicates an array of `{NodeId, Rank}` pairs.

The rules come from data. `UPseudoProgressionData` holds the XP needed per level, the max level, skill points per level (with extra points at milestone levels), the starting points, and how much each primary stat (Strength, Dexterity, Vitality, Spirit) grows per level. It's set in project settings as the story progression. Each enemy's data asset got one new field, `XPReward`.

## XP from a gameplay event, levels as one replaced effect

The progression component listens on its ability system component for the `Event.Combat.Kill` gameplay event, on the server. For each kill it reads the dead enemy's `XPReward`, adds it, and checks the level table.

For stat growth I didn't add a modifier per level. There is one effect class, `UPseudoGameplayEffect_LevelGrowth`, with a SetByCaller modifier per primary stat. On every level-up the component removes the old one and applies it again with `growth × (Level − 1)` per stat. The derived stats (max health and so on) are already calculated from the primaries by modifier magnitude calculations, as described in [Data-Driven RPG Stats in UE5 GAS](./2026-11-14-pseudo-data-driven-stats-mmc), so they follow without any extra code.

The same base class, `UPseudoGameplayEffect_PrimaryBonus`, is reused by the skill tree for nodes that raise stats, with its own subclass. Because applying a bonus replaces the previous one of the same class, level growth and skill-tree stats never stack on top of stale copies of themselves.

## A tree is a data asset of nodes

Each tree, `UPseudoSkillTree`, is a list of nodes. A node has:

- an id, which is a gameplay tag under `Skill.*`, never an array index
- a type: **Active**, **Passive**, **Unlock** or **Augment**
- max rank, cost per rank, required level, and prerequisites (all of them, or any of them)
- a position for the menu
- what it does: primary stats per rank and an optional effect (Passive), granted tags (Unlock and Augment), or an ability and its input tag (Active)

The tree assets validate themselves in the editor (`IsDataValid`), and the list of trees lives in project settings. I made three to start with: greatsword, dual pistols, and a common tree.

## One function decides whether a node can be learned

`GetLearnBlocker` takes a node and returns the reason it can't be learned, or nothing. It checks skill points, prerequisites, the required level and the max rank. The menu calls it to grey out a node and show the reason. `ServerLearnNode` calls the same function before it changes anything, and rejects the request with a log line if a reason comes back.

Sharing the function is what keeps the client honest without duplicating rules: the UI can't show a node as learnable that the server would refuse, and a forged request (I tested with a cheat command that learns a node directly) hits the same check and is turned down. The test produced the rejections I expected: "needs level 3", "prerequisites missing", "needs 1 SP (0)" and "max rank" on a fourth rank of a three-rank node.

## How each node type is represented in GAS

This is the part I'd copy. Every type maps to something GAS can add and remove on its own:

| Node type | What learning it does | What respec undoes |
|---|---|---|
| Passive | Primary bonus summed over learned ranks, plus the node's effect applied at level = rank (magnitude via `SetByCaller.Skill.Magnitude`) | Remove the effects |
| Unlock | Replicated loose gameplay tags | Remove the tags |
| Augment | Replicated loose gameplay tags that other systems check | Remove the tags |
| Active | Grant an ability spec bound to an input tag | Clear the ability spec |

The systems the tree affects don't know the tree exists. They only check tags:

- **Unlock** nodes gate content. The dice all-in move checks `Unlock.Dice.AllIn`. Each special ammo type has an `UnlockTag` on its data asset, and the ranged component simply skips locked types when choosing or cycling ammo.
- **Augment** nodes change existing attacks. The combo graph has a list of augments (tag, which combo nodes it affects, and an element, gauge or damage override). When the combo ability applies hit damage and the owner has the tag, it applies the override. In the greatsword tree, "Burning Finisher" turns the last attack of the light combo into a Fire attack with a gauge of 20; the earlier attacks stay Physical.
- **Active** nodes grant an ability. On the pistols, "Special Ammo" grants the special fire on its own input, and before this the ability was granted by default. So the special fire doesn't exist until you learn the node, and even then it fires nothing until at least one special ammo type is unlocked.

Respec refunds every spent point and runs the reverse of each row above. It's free and allowed anywhere for now, because there is no hub yet.

## A menu built in C++

The menu, `UPseudoMenuWidget`, is built in C++: a header with level, XP and points, tabs per tree, a button per node at its stored position colored by state, lines for prerequisites, a details panel and a respec button. The menu input (Escape, M, and the gamepad's Options button; M exists because Escape stops play-in-editor) puts the controller into game-and-UI input mode with the cursor and ignores look input while it's open. Clicking a node sends the learn request to the server. It is functional rather than pretty, on purpose for this first version.

## Testing on a listen server with a client

I ran it in play-in-editor as a listen server plus one client:

- A kill gave 20 XP. Adding 300 XP with a cheat went to level 3 with 70 / 200 XP and 3 skill points. Primaries went from 10 to 12, max health from 150 to 160. The client player's own progression matched on the server.
- Passive: two ranks of Strength+ gave +4 Strength.
- Unlock: the dice tag appeared on server and client.
- Augment: only the finisher dealt Fire with gauge 20.
- Active: no special fire before learning it, none with no ammo type unlocked, shotgun shells after unlocking them, and cycling only between unlocked types.
- Respec: 10 points refunded, Strength 24 → 18, no unlock or augment tags left on either machine, and the special fire gone.
- A learn on the client replicated its points, rank, Vitality and max health.
- The combo, pistols and dice still worked after a respec.

One thing could not be checked from a script: the real mouse click on a node button. That needs a hand test.

## Applying this to your own tree

- Put progression on the player state if your pawn can die and respawn.
- Write the learn check once and call it from both the UI and the server RPC. Return a reason, not a bool, so the UI can show it and the server can log it.
- Represent each node as an effect, a loose tag or an ability spec, and keep a record of which it is, so respec can undo exactly that.
- Let other systems check tags instead of asking the skill tree. Then a new unlock is a tag on a data asset, not a dependency.
- For per-level stat growth, re-apply one effect with SetByCaller values instead of stacking one modifier per level.

## Left for later

Saving and loading progress (there was no save system yet), level-up feedback (effects, sound, a heal), the menu's look and gamepad navigation, an equipment tab, limiting respec to a hub once there is one, multiplayer progression with its own data, and Active skills that add new moves to the combo. One oddity from the test wasn't investigated: the host lost health once while the enemies were frozen.
