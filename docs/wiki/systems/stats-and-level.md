---
title: "Stats and Level"
description: "PSEUDO's five primary stats (STR, DEX, VIT, SPI, LUK), why they grow automatically instead of being allocated, how each turns into derived combat values through curves with soft caps, how attack speed interacts with timing windows, and how XP, levels and skill points work."
publishAt: 2026-10-23
outline: deep
---

# Stats and Level

PSEUDO has five primary stats. They grow on their own as you level up, and each one turns into a handful of combat values through curves. Where your character goes is decided on the skill tree, not by spending stat points. This page covers the stats, what they produce, and how levels and experience work.

Numbers are first values from the data tables and will be tuned.

## The five primaries

| Stat | Covers | Turns into |
|---|---|---|
| **STR** Strength | Melee | Melee damage bonus, poise damage, knockback resistance |
| **DEX** Dexterity | Ranged, speed | Ranged damage bonus, crit chance, attack speed |
| **VIT** Vitality | Survival | Max HP, poise, status resistance |
| **SPI** Spirit | Magic, elements | Magic damage bonus, element gauge, status chance, Elemental Mastery, max mana |
| **LUK** Luck | Luck | Wider perfect windows, fall damage and status negation, crit damage, drop rate |

Every stat answers a question a player would ask: "do I hit harder up close" (STR), "from range" (DEX), "can I take a hit" (VIT), "do my elements land" (SPI), "does timing get easier" (LUK).

### Why there's no stat allocation

Primaries grow automatically with level, following a growth curve. There are no points to spend on them.

Manual allocation would mostly create ways to build a character badly, and the interesting choices in PSEUDO are already elsewhere: which weapons, which skill tree nodes, which dice upgrades. Automatic growth also keeps a respec cheap, because only skill tree choices need to be undone, and it keeps the save small: level, XP, skill points and learned nodes are all that's stored.

## From primaries to combat values

Each primary feeds its derived values through a curve, one row per mapping, in a curve table:

| Mapping | At 0 | At 100 | At 200 |
|---|---|---|---|
| VIT → Max HP | 0 | 500 | 750 |
| STR → Melee damage bonus | 0 | +100% | +150% |
| DEX → Crit chance | 0 | +25% | +35% |
| DEX → Ranged damage bonus | 0 | +100% | +150% |
| LUK → Crit damage | 0 | +0.5 | +0.75 |

Every curve has a **soft cap at 100**: past that, the slope halves. Stats keep paying off, but less, which keeps late levels from multiplying out of control without a hard wall the player can hit.

These bonuses are added on top of base values from a player stats table (base HP, Defense, crit chance 5%, crit damage ×1.5). At the default Strength 10, Dexterity 10 and so on, that comes out to 150 HP, 7.5% crit chance and a +10% melee bonus.

### How it runs

All derived values come from **one permanent effect** on the character. Each of its modifiers asks a small calculation class "given this primary, what's the bonus?", and that class reads the curve. Two choices matter here:

- **The calculation lives in code, the numbers live in the curve table.** Editing a curve and reimporting the CSV changes the game on the next play session. Nobody touches the code to rebalance.
- **Primaries aren't snapshotted.** If a buff raises Strength, the melee bonus follows it right away.

When the character spawns, the server sets base values from the table, removes and reapplies the derived-stats effect, and fills health to the new max. The removal matters: the ability system lives on the PlayerState, which outlives the character, so reapplying without removing would stack the effect.

### Where the values sit

Attributes are grouped into sets by who needs them and what rules they share:

| Set | Holds |
|---|---|
| Primary | STR, DEX, VIT, SPI (Luck has its own set, so the luck system can grow) |
| Health | HP, max HP, element shield |
| Combat | Attack power, defense, crit chance and damage, melee and ranged damage bonus, attack speed, poise |
| Resistance | One resistance per element |
| Status | Buildup per status |
| Weapon resource | Ammo, mana |
| Dice | Pips |

The [Damage Formula](/wiki/systems/damage-formula) page shows exactly where each of these enters a hit.

## Attack speed and timing windows

Dexterity raises attack speed, and attack speed raises the play rate of attack animations. Every timing window in PSEUDO, combo windows and perfect windows included, is a marker on those animations. So a faster attack has shorter windows in real time.

I decided to let that happen, with a floor: windows scale with play rate, but the perfect window never drops below about 80 ms of real time. A fast build should feel fast and a bit harder to time. It shouldn't become impossible to land a perfect input.

Luck pulls the other way, adding time around perfect windows. A Dexterity-and-Luck build gets speed and keeps its timing.

## Level and experience

| | Decision |
|---|---|
| XP from | Kills, stage clears, and a bonus the first time you discover an element reaction |
| Curve | A curve table; the vertical slice tops out around level 30 across Stages 1–3 |
| Each level | Primaries grow by the growth curve, +1 skill point (+1 extra at milestone levels) |
| Extra skill points | First boss kills, hidden content, discoveries |
| On level up | HP refills, plus an effect and a sound |
| Respec | Free in the hub during the vertical slice |
| Authority | The server owns level, XP and skill points |

The reaction-discovery bonus is small, but it's there to nudge players to try element combinations instead of sticking to the one that works.

### Story and multiplayer use different profiles

The same components run in both modes, but each mode points at its own progression profile: growth curve, skill point rules, which skill tree nodes are allowed, and the save slot. The multiplayer arena can be balanced without touching the story's progression.

## Status

In the build and tested with a host and a client: the primary and combat sets, the player and enemy stat tables, the stat curves, the derived-stats effect, and their use in the damage formula. Changing Strength or Vitality with a cheat updated max HP and the melee bonus on both machines. Experience, levels and skill points come with the progression work, alongside the skill tree.
