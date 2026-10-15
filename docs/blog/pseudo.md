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

Every dice skill rolls **2d6**. I picked two dice over one because the sum clusters around 7, so luck pushes you around less, and a bonus that shifts the result feels like effort paying off.

| Sum | Result | Chance |
|---|---|---|
| 2 | Critical failure | 2.8% |
| 3–5 | Failure | 25% |
| 6–8 | Normal | 44.4% |
| 9–11 | Success | 25% |
| 12 | Critical success | 2.8% |

- **Doubles** (both dice the same) add a bonus effect. That's a 1 in 6 chance, a small hit of reward that comes often. Double sixes are 1 in 36.
- **Four dice skills on Q / E / R / F**, each with its own cooldown: one for your own stats, one for self buffs, one for enemy stat debuffs, one for enemy skill debuffs (confusion, stop, sleep). They unlock gradually, starting with a single skill in the tutorial.
- **Perfect dodges and parries shorten the dice cooldowns.** That's the link between skill and luck: better play means more rolls.
- **The first roll is scripted as a critical success**, so the player sees the best case before anything else.
- **Bad luck stacks.** Failures build up a counter, and at a set count the next roll is a guaranteed critical success.

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

- **The Ability System Component and the attribute sets live on the PlayerState**, not the pawn, so they survive pawn swaps. Enemies own their own ASC. There are four attribute sets: Health, Resource, Combat, and Luck.
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

## Where it stands

The repository has the framework in place: game mode, player controller and state, the ability system component, the four attribute sets, a data-driven input config, a jump ability, and a prototype map where the character moves and the camera orbits. The first bug I had to track down is in the debugging note above.

Next up is melee combat, then the dice system.

## Credits

- Characters and animations: Paragon Twinblast and Paragon Kwang, from Fab.
- Dice model: Classic dice by Andromeda3D, from Fab.
- "Animated Butterfly" by Artistic_side, licensed under [Creative Commons Attribution 4.0](http://creativecommons.org/licenses/by/4.0/), via [Sketchfab](https://skfb.ly/oFpIO).
