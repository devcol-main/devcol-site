---
title: "Enemies: One AI Framework, Data for Everything Else"
description: "How PSEUDO builds its enemies: a shared State Tree driven by a per-enemy data asset, attack selection by range, cooldown, tags and weighted random, attacks as one shared Gameplay Ability with socket-based hit traces, server-only AI, a roster of grunts, elites and bosses per stage, and the two-layer boss setup of data phases plus a boss tree."
publishAt: 2026-11-01
outline: deep
---

# Enemies: One AI Framework, Data for Everything Else

PSEUDO is a solo project with three stages, and every stage needs enemies that feel different from each other. If each enemy got its own AI and its own attack code, the roster would be the most expensive thing in the game and the same bug would get fixed a dozen times. So the rule from the start was: **one AI framework, and everything that makes an enemy different lives in data.** Adding a grunt or an elite should mean a mesh, its animations, and one data asset. No code, no new behavior tree.

This page covers that framework, how an enemy picks an attack, how bosses extend it, and the roster it has to serve.

## Rules that shaped it

- **Not tied to one skeleton.** Most enemies will be non-Paragon monster assets, with some Paragon characters mixed in. Nothing in the AI or attack code may assume Paragon bone names, sockets or montage conventions. Sockets, montages and ranges all come from data.
- **Bosses are not tied to a stage.** The story may move a boss somewhere else or give it a different skin. Everything boss-specific is in its data asset and its boss tree, never in a level script.
- **Each stage needs at least a grunt, an elite and a boss.** Everything beyond that is a nice-to-have.
- **Stages restrict weapons.** Stage 1 is melee only, Stage 2 is ranged only, Stage 3 allows both. Enemies are chosen to suit what the player can do there.

## The structure

```
APseudoAIController (server only)
 ├─ StateTreeAIComponent ── ST_Enemy_Base (shared by every enemy)
 │                           └─ bosses: own tree that links the shared combat logic
 └─ AIPerceptionComponent ── senses configured from the enemy data
APseudoEnemyCharacter
 ├─ Ability System Component + attribute sets (health, combat, resistances, status)
 ├─ attacks = Gameplay Abilities (montage + hit-window notify + server hit detection)
 └─ UPseudoEnemyData ── everything that makes this enemy different
```

One Blueprint serves every enemy. The enemy's body (skeletal mesh, animation class, mesh offset, capsule size, walk speed) is part of `UPseudoEnemyData`, applied when the enemy spawns.

### The base tree

AI behavior uses State Tree rather than a Behavior Tree. The shared tree, `ST_Enemy_Base`, has five states:

| State | Does | Leaves when |
|---|---|---|
| Idle / Patrol | Waits or follows a patrol path | Hears or feels something → Suspicious; clear sight → Combat |
| Suspicious | Walks to the noise or the last place it saw you | Target confirmed → Combat; nothing there → Patrol |
| **Combat** | The attack selection loop (below) | Target lost → Lost |
| Lost | Searches around your last known position | Found → Combat; timeout → Return |
| Return | Walks back home | Arrived → Idle |

The first enemy only needed Idle and Combat (target = the nearest living player within a radius), but the tree was laid out for all five from the start, so perception and searching slot into the same asset instead of replacing it. Enemies flagged `bAlwaysInCombat` in their data (bosses) skip the idle family entirely.

The tree's tasks are thin wrappers that call functions on `APseudoAIController`. The logic lives in C++, where it can be debugged and diffed; the tree only decides which function runs when. The tree asset itself is built by an editor script, so it can be regenerated rather than hand-edited.

## How an enemy picks an attack

Inside Combat, every enemy runs the same four-step loop over the attack list in its data:

1. **Filter.** Keep attacks where the target's distance is inside `[MinRange, MaxRange]`, the cooldown is over, any `RequiredTags` are met (for example, a boss phase tag, or "target is behind me"), and the enemy can afford the attack's ticket cost.
2. **Weighted random.** Pick one of the survivors by `Weight`, using a seeded random stream on the server so a fight can be reproduced while debugging.
3. **Execute.** Move until in range, activate the attack ability, wait for it to end.
4. **Nothing left?** If every attack is on cooldown or no ticket is available, keep distance, strafe or wait.

An attack entry looks like this:

```
FPseudoEnemyAttack {
  AbilityTag        Ability.Enemy.Attack.<Name>
  Montage           the attack montage (soft reference)
  MinRange/MaxRange 0 / 250 cm
  Cooldown          4 s
  Weight            1.0
  TicketCost        2
  RequiredTags      (optional)
  HitSockets        hand_r, ...   (trace points on the enemy's mesh)
  DamageMultiplier, DamageElement, ElementGauge
}
```

**Tickets** are how a group of enemies avoids attacking all at once. Only so many attack tickets are available against a player at a time; a grunt's swing costs 1, an elite's heavy hit costs 2, and bosses and mid-bosses are exempt. Enemies without a ticket circle and wait their turn, which is what makes a crowd readable instead of a blender.

Cooldowns are stored as world-time timestamps on the controller. World time is deliberate: when the player triggers slow motion, enemy cooldowns slow down with the world, so slow motion is a real advantage rather than a cosmetic one.

### Why weighted random

| Option | Pros | Cons |
|---|---|---|
| **Shared tree + data (chosen)** | New enemies are cheap, one place to fix bugs, balance lives in data | Very unusual behavior is hard to express in data, so only bosses get their own trees |
| A tree per enemy | Most freedom | Trees grow with the roster; the same bug gets fixed many times |
| Behavior Tree | Lots of references and tutorials | I wanted State Tree as the default, with BT only as an exception |
| Utility AI | The most natural-looking choices | More code and more tuning; filtering plus weighted random is the light version of the same idea |

## Attacks are one shared ability

There is no Gameplay Ability class per enemy. A single class, `UPseudoGameplayAbility_EnemyAttack`, reads the montage, hit sockets, damage multiplier and element from the attack entry it was activated for.

- **Timing comes from the montage**, through an Anim Notify State that opens and closes the hit window. Never timers, because timers don't respect time dilation and the animation does.
- **Hit detection traces between the sockets listed in the data**, on whatever mesh the enemy has. The trace task was generalized from the player's melee trace to "a mesh plus a list of sockets", so any skeleton works.
- **Damage goes straight down the server path.** AI only runs on the server, so an enemy hit goes through the same validation, damage effect, element and resistance code as a player hit (see [Damage Formula](/wiki/systems/damage-formula)) without a client prediction step.

One implementation detail: because every attack shares one ability class, the attack's identity is a dynamic tag on the granted ability spec, and activating by tag doesn't match dynamic spec tags. The controller keeps a map from attack tag to spec handle and activates by handle instead.

Attack wind-ups also fire a telegraph cue: a red signal for attacks you can't block, purple for attacks you can only dodge. That ties into the player's [Defense](/wiki/systems/defense) options.

## Network

Everything that decides anything runs **only on the server**: the State Tree, perception, attack choice, hit detection and damage. Clients receive the results through systems that replicate anyway: character movement, montages through the ability system, and health and tags through attribute and tag replication. No AI code runs on a client, so a client can't disagree with the server about what an enemy is doing.

## The roster

Per stage, the plan is one required grunt, elite and boss, with optional extras.

| Stage | Tier | Role | Behavior |
|---|---|---|---|
| Tutorial | Grunt | Practice target | One slow attack with a long telegraph, no ticket needed |
| Stage 1 (melee) | Grunt | Basic melee (Paragon lane melee minion) | Approach, then a one- or two-hit chain |
| | Elite | Brute | Slow heavy hits; its big smash is the parry practice |
| | Elite | Shield (optional) | Guards its front; flank it or break the guard |
| | Mid-boss | Fast beast (optional) | Leap attacks and fast chains |
| | Boss | Rampage | Phases, ground slams, a thrown rock, a part shield |
| Stage 2 (ranged) | Grunt | Ranged | Keeps distance, shoots, strafes |
| | Grunt | Monster swarm | Sound-sensitive, short sight, comes in numbers, has breakable parts |
| | Elite | Sniper (optional) | Long range with a visible aim line; take cover |
| | Boss | Artillery | Area bombardment; shoot its weak parts |
| Stage 3 (both) | Mixed | Squads | Melee front line, ranged back line, reusing earlier enemies |
| | Boss | Heavy melee | Big swings and phases |

The first grunt is Paragon's lane melee minion, which has two sets of attacks in its animation pack. Most Paragon heroes ship with 90 to 250 animations but no Physics Asset, so one has to be created when a hero is brought in as an enemy.

## Bosses: data phases plus a boss tree

Bosses are where data alone runs out, so they get two layers.

**Data phases** apply to every enemy, and mid-bosses use only this layer. The enemy data lists phases: an HP threshold, the phase tag it grants (`Boss.Phase.N`), a buff effect, a montage play rate, and a shield mode (none, once, or regenerating). A phase component judges the thresholds once, on the server. Attacks with a matching `RequiredTags` entry unlock automatically, so "phase 2 adds a ground slam" is a data change.

**The boss tree** (`ST_Boss_<Name>`) is for authored behavior: fixed attack sequences with their own cooldowns and ranges, waiting for a part shield to break, regenerating the shield. The ordinary attack loop is linked into it as an asset (`ST_Enemy_CombatLoop`), one round per entry, so a boss gets the shared behavior for free between its set pieces.

One rule keeps the two layers from fighting: **HP is never judged in a tree.** The tree reads the phase tag; only the phase component decides when the phase changes.

Projectiles (the boss's thrown rock, later the ranged enemies) are their own server-judged actor and go through the same defense chain as a melee swing, so a perfect dodge works the same against both.

## What's still open

- The monster assets for Stage 2's swarm enemies.
- Per-enemy numbers (senses, ranges, cooldowns, damage), which only playtesting can settle.
- Perception, searching and returning home are designed but arrive with the full enemy AI pass.

For how the first enemy's bugs went, see [Two Bugs from the First Enemy](/blog/2026-10-20-pseudo-first-enemy-camera-and-facing) and [Hits That Only Landed When the Host Was Watching](/blog/2026-10-20-pseudo-offscreen-enemy-hits).
