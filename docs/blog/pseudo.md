---
title: "PSEUDO"
description: "Overview of PSEUDO, a solo Unreal Engine 5 stylish action RPG built around a 2d6 dice mechanic: the idea, the design rules, how the code is organized, and where every DevLog and debugging note lives."
outline: deep
---

# PSEUDO

PSEUDO is a stylish action RPG with a multiplayer Hyper TPS mode, built solo in Unreal Engine 5.8 with C++. It's the project I'm building right now, and the one I plan to take to a Steam release.

The design philosophy I wrote at the top of the planning doc is "Dopamine Driven Design": the fights should feel good moment to moment, and the dice should make that feeling spike at the right times.

## The name

PSEUDO is *pseudo-random* and *pseudo-reality* at once. The logo is written **PSEUd0**: the `d` is dice notation, and the `0` is a zero, so `d0` reads as a die with no faces. You can roll it all you like and there's nothing to land on.

That's also a plain technical fact. A computer's random number is pseudo-random, and with the same seed it gives the same result every time. The game's question comes out of that:

> *The result was already decided. Did you still roll?*

I'm not trying to answer it. The game asks, and neither choice at the end is marked as the right one.

## The core mechanic: skill and luck

> **Skill earns you the chance to roll. Luck decides the result.**

Every roll is **2d6**. I picked two dice over one because the sum clusters around 7, so luck pushes you around less, and a bonus that shifts the result feels like effort paying off.

| Sum | Result | Chance |
|---|---|---|
| 2 | Critical failure | 2.8% |
| 3–5 | Failure | 25% |
| 6–8 | Normal | 44.4% |
| 9–11 | Success | 25% |
| 12 | Critical success | 2.8% |

- **Doubles** (both dice the same) add a bonus effect. That's a 1 in 6 chance, a small hit of reward that comes often. Double sixes are 1 in 36.
- **Dice are charged, not timed.** You hold up to three stored dice (pips), and only perfect play fills them: a perfect dodge, a perfect parry or an on-beat combo input. That's the link between skill and luck: better play means more rolls.
- **One roll key, three types.** Attack buffs you, Curse debuffs an enemy, Guard protects you. A second key cycles between them, and holding the roll key spends all three pips on an All-in roll that applies to every type at once.
- **The first roll is scripted as a critical success**, so the player sees the best case before anything else.
- **Bad rolls can be turned around.** A failure comes with a short Reversal challenge that flips the penalty into a bonus, and failures build a visible stack that raises Luck and, at a set count, guarantees a critical success.

The full rules, with the odds and the reasoning, are on the wiki's [Dice](/wiki/systems/dice) page.

There are two difficulties. *Story* guarantees at least a Normal result. *Real* lowers the odds of good results, strips most of the UI down to the dice faces, and gives enemies dice too.

## The shape of the game

The game splits into two kinds of places, with two characters:

- **The hub** is a small world, not an open one, where you play the main character (MC). It holds decorating, a shop, stage portals, and a portal for re-challenging bosses.
- **The stages** are where you play the sub character (SC), the avatar the MC uses to log in. The tutorial teaches by level design with no text. Stage 1 is melee only, Stage 2 is ranged only, and Stage 3 allows both with weapon switching. Bosses have breakable parts, shields over those parts, and a mechanism you have to disable before you can hurt them.

The multiplayer mode is a **dice arena**, a Hyper TPS match where every round, all players roll to change the rules (low gravity, one-shot kills, infinite magazines).

I'm leaving the story's turns out of this page on purpose.

## Design rules I'm holding myself to

- **One default camera.** Switching weapons doesn't switch the camera. A special camera can take over for a specific mechanic and then hands back to the default.
- **One SC, with the stage deciding the rules.** There's no second playable character. Each stage allows or blocks a weapon mode, which also fits the theme: the game sets the rules.
- **No real money anywhere near the dice.** Gambling-style mechanics stay in-game only.
- **Don't send color as the only signal.** Wherever a color means something, a count, size, sound, or icon says it too.

## How the code is organized

The full write-up is the framework doc in the repository. The decisions that shape everything else:

- **The Ability System Component and the attribute sets live on the PlayerState**, not the pawn, so they survive pawn swaps. Enemies own their own ASC. Attributes are grouped into sets by the rules they share: primaries, health, combat stats, resistances, status buildup, and Luck on its own so the luck system can grow. The full list is on the wiki's [Stats and Level](/wiki/systems/stats-and-level) page.
- **One player character class for both MC and SC.** The differences live in a `UPseudoPawnData` data asset, not in subclasses.
- **Input goes through GameplayTags.** Enhanced Input actions map to `InputTag.*` tags, which feed the ability system.
- **Single player is a listen server with one player.** I'm designing for server authority and replication from the start, so the multiplayer mode isn't a rewrite later.
- **Dice rolls are a seeded random stream**, and their results are applied as SetByCaller Gameplay Effects.
- **Numbers live in spreadsheets.** Stats, skill values, monsters, and drops are written in Excel/CSV and imported as DataTables. DataAssets hold asset references and structure, and the two connect through row IDs.
- **Lyra is an architecture reference only.** I read it to see how responsibilities are split, and I don't use its project, characters, or assets.
- **Animation logic is in C++** (`UPseudoAnimInstance`), with a thin Animation Blueprint per skeleton and Linked Anim Layers per weapon mode. The SC is Paragon Twinblast with a MetaHuman face. Melee animations come from Paragon Kwang, retargeted to Twinblast once, offline.

## Reading order

**DevLogs**

- [Git Setup for a UE5 Project Before the First Push](./2026-10-11-pseudo-git-setup)

**Debugging notes**

- [Why WASD Did Nothing: A Player Controller with Tick Turned Off](./2026-10-13-pseudo-player-controller-tick-blocks-input)

**Putting a MetaHuman Face on a Paragon Body** (a five-part debugging series)

- [Putting a MetaHuman Face on a Paragon Body, Part 1: Four Setup Blockers Before Assemble](./2026-10-14-pseudo-metahuman-paragon-1-setup)
- [Putting a MetaHuman Face on a Paragon Body, Part 2: Making the Face Follow a Head It Wasn't Built For](./2026-10-14-pseudo-metahuman-paragon-2-face-attach)
- [Putting a MetaHuman Face on a Paragon Body, Part 3: Removing a Head Without Losing the Shirt](./2026-10-14-pseudo-metahuman-paragon-3-headless-mesh)
- [Putting a MetaHuman Face on a Paragon Body, Part 4: Grooms That Scatter and Hair That Vanishes at Mid Range](./2026-10-15-pseudo-metahuman-paragon-4-grooms)
- [Putting a MetaHuman Face on a Paragon Body, Part 5: The Coat Stops Flapping and the Braids Won't Calm Down](./2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair)

## Where it stands

The framework is in place (game mode, player controller and state, the ability system component, a data-driven input config), and the first combat systems are in the build: the greatsword's combo graph with perfect inputs, two weapon slots with a swap, hit detection validated on the server, the damage formula with stats, and elements with resistances, status buildup and element shields.

Since then, defense (dash, guard, parry and their perfect versions, judged on the server by timestamps), the full dice system, lock-on with camera modes and hitstop, a non-combat mode with weapon stowing, and a shared enemy AI framework with a first melee grunt have landed. Next up are hit reactions (groggy, knockback, knockdown) and the skill tree. The design for every system is on the [wiki's Systems pages](/wiki/systems/).

## Credits

- Characters and animations: Paragon Twinblast and Paragon Kwang, from Fab.
- Dice model: Classic dice by Andromeda3D, from Fab.
- "Animated Butterfly" by Artistic_side, licensed under [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/), via [Sketchfab](https://skfb.ly/oFpIO).

Updated 2026-10-21: the dice section now says pips come only from perfect play, "Where it stands" covers defense, dice, lock-on and enemy AI, and the reading order lists the MetaHuman face series.

Updated 2026-10-20: the code section now reflects the attribute sets in the current design, and "Where it stands" covers the combat systems built since this page was written.
