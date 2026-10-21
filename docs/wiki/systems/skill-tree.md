---
title: "Skill Tree: Weapon Trees, Node Types and Tags"
description: "How PSEUDO's skill tree is built: one tree per weapon plus a common tree, four node types (Active, Passive, Unlock, Augment), why nodes are saved by gameplay tag and never by index, server-side learning, free respec in the hub, and separate progression profiles for story and multiplayer."
publishAt: 2026-10-24
outline: deep
---

# Skill Tree: Weapon Trees, Node Types and Tags

Stats in PSEUDO grow on their own when you level up (see [Stats and Level](/wiki/systems/stats-and-level)), so the skill tree is where the build choices are. Each level gives a skill point, and you spend points on nodes. This page covers how the trees are laid out, what a node can do, and how the tree is wired into the combat systems without any of them knowing it exists.

The skill tree is designed but not built yet. It's the next progression issue after the combat work, so everything here is the decided design.

## The trees

| Tree | What it holds |
|---|---|
| **Greatsword** | Skills, combo branches and upgrades for the greatsword |
| **Dual pistols** | The same for the pistols |
| **Dual blades** | Planned, if the roster gets there |
| **Second ranged weapon** | Bow or magic, still undecided |
| **Common** | Survival, Mobility (dash upgrades, air dash), Dice, Element affinity |

Every weapon has its own tree, and a new weapon brings a new tree asset with it. That matches how weapons work in general: adding a weapon means adding data, not combat code (see [Weapons](/wiki/systems/weapons)).

The common tree holds what doesn't belong to a weapon. The Dice branch is the one I've designed in the most detail: the All-in roll, Advantage (roll three dice, keep the best two), Re-Roll, a +1 or +2 roll bonus, a smaller bad-luck stack, and more pips per perfect input. The [Dice](/wiki/systems/dice) page covers what each of those does to the odds.

The layout follows the Stellar Blade pattern: a main skill sits on the tree, and derived upgrades and unlocks branch off it. Learning the skill is one decision; making it yours is a series of smaller ones after it.

## Four node types

| Type | What it does | How it's implemented |
|---|---|---|
| **Active** | Gives you a new skill | Grants a Gameplay Ability |
| **Passive** | Changes stats, resistances or multipliers | A Gameplay Effect; the node's rank is the effect level |
| **Unlock** | Opens a feature: the air dash, the greatsword's heavy branch, a higher perfect-stack cap, All-in | Grants an `Unlock.*` gameplay tag |
| **Augment** | Changes an attack you already have, for example the last hit of a combo becomes a Fire hit | Grants an `Augment.*` tag that the combo runner reads |

Only Active and Passive touch abilities and effects directly. The other two are just tags, and that's the part I like most about this design.

### Unlocks are combo transitions

Every transition in a weapon's combo graph can require tags (see [Combos and Cancels](/wiki/systems/combo-and-cancels)). The heavy branch of the greatsword has a transition that requires `Unlock.Combo.Greatsword.HeavyBranch`. Until you learn that node, the transition simply doesn't match and a heavy press does what it did before.

So the combo system has no idea the skill tree exists. It already checks tags for situational attacks (an attack out of a dash requires `State.Dashing`, a counter requires `State.Perfect.Parry`), and a skill tree unlock is one more tag in the same list. The dice system reads its unlocks the same way: All-in checks for an unlock tag. Right now those tags come from a default list in the project settings; when the tree exists, the nodes grant them instead, and nothing in the dice code changes.

### Augments override one attack

An Augment doesn't add a skill; it changes the data of an attack you already have. When a combo node starts, the combo runner checks the character's `Augment.*` tags and overrides the node's attack spec: a different element, a different multiplier, an extra effect.

Elements show why that order matters. Three sources can set the element of the same hit, and the priority is **Augment > dice imbue > the weapon's default element**. A fire finisher you chose on the tree should stay fire even when a dice roll is imbuing your weapon with something else for a few seconds.

### Active skills don't get their own buttons

The keys around WASD are already taken by guard, interact, a potion and the dice, so Active skills live inside the combo graph as **skill chords**: hold L1 or R1 (E or Left Ctrl on PC) and press attack. An Active node grants the skill and a chord entry into the graph. There's no skill bar, and no cooldown row to watch.

## What a node is, as data

A skill tree is a data asset, and each node is a row in it:

| Field | Purpose |
|---|---|
| **NodeId** | A gameplay tag, and the key the save file uses |
| Type | Active, Passive, Unlock or Augment |
| Ability / Effect / Tags | What the node grants |
| MaxRank, CostPerRank | How many times it can be learned and what each rank costs |
| Prerequisites | Other nodes, with "all of" or "any of" |
| RequiredLevel | A level gate |
| UI position, icon, description | For the tree screen |

Rank values (for a Passive that gives +5% per rank, say) come from a curve table, so balancing ranks is a spreadsheet change.

### Why the save key is a tag, not an index

The node's ID is a gameplay tag like `Skill.Greatsword.HeavyBranch`, never its position in an array. I'll be adding, removing and reordering nodes for months. If a save stored "node 7, rank 2" and I inserted a node above it, every save would silently shift by one and give players skills they never picked.

I learned this one the expensive way on a different system. On a skeletal mesh, PSEUDO's material overrides referred to slots by index, I deleted one empty slot, and the shirt quietly moved into the range that was being hidden. A tag doesn't renumber when its neighbors change.

## Learning a node

The tree state lives in a component on the PlayerState, next to the Ability System Component, so it survives the pawn being swapped or respawned. It replicates a short list of learned nodes as `{NodeId, Rank}` pairs.

Learning is a server call. The server checks that you have the skill points, that the prerequisites are met and that you're at the required level, then grants the ability, effect or tags. It keeps the handles for everything it granted, which is what makes a respec cheap: it removes exactly what it added and refunds the points.

**Respec is free in the hub** during the vertical slice. Because stats grow automatically, the tree is the only thing a respec has to undo. A free respec also lowers the stakes of trying a node; I'd rather players experiment than read a guide before spending their first point.

## Story and multiplayer

The arena and the story use the same components but point at different progression profiles. A profile sets the growth curve, the skill point rules, which nodes are allowed and which save slot is used. That means the arena can ban a node, or hand out points differently, without touching the story's balance.

## What's in the first build

The work is split by priority. The first build gets **Passive and Unlock nodes** with a plain list UI and skill points spent in the hub. **Active and Augment nodes** and the proper tree screen with nodes and links come after that. Passive and Unlock nodes are enough to make the dice upgrades and combo branches learnable, which is what the vertical slice needs.
