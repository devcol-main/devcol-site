---
title: "Boss Sheets and the First Boss, Rampage"
description: "How I design a PSEUDO boss on one sheet before building it, separating new mechanisms from tunable numbers, and the first sheet in use: Rampage's identity, two phases, attack patterns, part-break shield and the problems the first playtest found."
publishAt: 2026-11-04
outline: deep
---

# Boss Sheets and the First Boss, Rampage

[Enemies and AI](/wiki/systems/enemy-ai) explains the machinery every boss runs on: data phases, a boss State Tree, and the shared attack loop linked inside it. This page is about the step before that machinery: how I plan a boss on paper, and the first boss planned that way, Rampage.

## Why a sheet before the boss

Boss work splits into two very different kinds of cost.

**Mechanisms** cost code and builds. A boss that leaps onto the player needs movement that lands on a target position. A boss that grabs needs a paired animation and a way to hold the player. An arena hazard needs an actor and server logic. Each of these is new code, and finding one halfway through building a boss means stopping, designing it, compiling, and redoing the parts that touched it.

**Numbers** cost nothing to change. Health, damage, cooldowns, ranges and recovery times live in the enemy data asset and are tuned during play without a build.

So a boss sheet is written before the boss exists, and its job is to surface every mechanism up front while letting the numbers stay rough. A "?" is a fine value. A missing mechanism is not. The process is:

1. Fill the template. Rough numbers are fine.
2. Mark every row that needs something the game doesn't have yet in a **New mechanism** column: leap to target, charge, grab, summon, arena hazard.
3. Build all the marked mechanisms in one pass, put the numbers in data, then playtest and tune data only.

Everything boss-specific lives in two assets, `DA_Enemy_<Name>` for data and `ST_Boss_<Name>` for authored behavior. Bosses are never tied to a level, so the same boss can move to another stage without anything in the level changing.

## The template

The sheet has five sections:

- **Identity**: name and assets, role (stage boss or mid-boss), a reference boss from another game and what to copy from it (pace, pressure, readability), size and speed feel, and how long the fight should take ("how many player combos to kill, how many hits to die").
- **Phases**: the HP threshold where each starts, what changes (buffs, speed, shield mode, new patterns), and the transition performance.
- **Patterns**: one row per attack pattern with its phase, start condition (distance, cooldown), the sequence of moves, the telegraph, the defense type (parryable, unblockable, dodge only), the recovery window the player gets to punish, any special movement, and the New mechanism flag.
- **Gimmicks**: breakable parts, shields, weak points, arena interaction.
- **Open questions**: whatever needs a decision before the feel pass.

The recovery column turned out to be the most useful one. Writing "recovery: none" in a row is much harder to ignore than feeling vaguely that a boss is relentless.

## Rampage

Rampage is the Stage 1 boss: a heavy brute built from Paragon's Rampage model. The brief is a big, slow hitter that **leaps at the player** and leaves readable pauses after its combos. It's built and playable; the feel pass is still ahead.

| | |
|---|---|
| Assets | `DA_Enemy_Rampage`, `ST_Boss_Rampage` |
| Role | Stage boss (Stage 1 for now) |
| First numbers | Max health 1500, defense 20, attack power 12 |
| Size | Scale 1 in data; the level instance is at scale 2 for a visual check |

### Phases

| Phase | Starts at | Change | Transition |
|---|---|---|---|
| 1 | Fight start | Three melee swings, a ground smash, a rock throw | — |
| 2 | 50 % health | Damage x1.2, animations x1.15 speed, a regenerating shield, an enraged throw | An enrage animation with super armor |

The phase change is pure data: the threshold, the damage buff, the play-rate multiplier and the shield mode are fields in the phase list, and the new phase 2 patterns unlock because they require the phase tag.

### Patterns

| Pattern | Phase | Starts when | Sequence | Telegraph | Defense |
|---|---|---|---|---|---|
| Single melee | 1, 2 | Within 2 m | One of three swings | — | Parryable |
| Smash chain | 1 | Within 3 m, 14 s cooldown | Swing, swing, ground smash | Floor ring + red flash | Swings parryable, smash unblockable |
| Rock throw | 1 | 5–20 m | Tears a rock out of the ground and throws it | Purple flash | Dodge only |
| Rampage | 2 | Within 3 m, 12 s cooldown | Swing, swing, ground smash | Floor ring + red flash | As the smash chain |
| Double toss | 2 | 5–20 m, 16 s cooldown | Two enraged throws | Purple flash | Dodge only |

The distance bands make the fight push and pull. Close in and Rampage chains melee; back off and it throws. Running away is never safe, and standing in front of it isn't either.

### The shield and breakable parts

Rampage has three breakable parts: each arm (150 health) and its back (120, which only takes damage from behind, at 1.5x). In phase 2 a shield goes up. Breaking either group, both arms or the back, drops the shield and stuns Rampage for 5 seconds. Twenty seconds after the stun ends, the shield regenerates.

That gives phase 2 a goal beyond draining health. You can work on the arms from the front while parrying, or get behind it for the back, which is faster but means dodging through its swings. Either way the stun is the big punish window of the fight.

## What the first playtest found

The first playable version showed the problems the sheet was meant to catch, and they're all now written into it.

**No recovery after melee.** Every melee row had "none yet" in the recovery column, and it played that way: Rampage chained one sequence into the next with no gap to answer. Every melee pattern now has a recovery step to build, with a first guess of 1.0 to 1.5 seconds, still to be tuned. Whether hits during recovery should do bonus damage is an open question.

**The rock throw is hard to read.** The rock leaves the hand too early, and it's too small to see at range. That's a tuning fix (release timing and rock scale) plus a trail effect, not a new mechanism.

**It feels too slow.** The scale-2 visual check needs matching speed. Doubling the scale doubles the stride, so walking speed has to go to around 630 cm/s to keep the feet from sliding. The final scale is still undecided.

## The one new mechanism: a leap slam

The brief said Rampage leaps at the player, and the first build has no leap. It's the only pattern on the sheet marked as a new mechanism:

| Pattern | Phase | Starts when | Sequence | Defense | Recovery | Mechanism |
|---|---|---|---|---|---|---|
| Leap slam | 1 or 2? | Far (roughly 6–15 m?) | Leap onto the player, impact area attack | Unblockable? | Long | Jump to the target position |

Landing on a target means root motion that ends at a position chosen at runtime. There are two ways to get that: the Motion Warping plugin, which warps a root-motion animation toward a target, or my own code that adjusts the jump's trajectory. Motion Warping is the standard answer, but adding a plugin is a project change I make deliberately, so it's listed as a decision rather than assumed.

Still open on the leap: which phase it belongs to, how the landing spot is telegraphed (a floor ring at the target is the likely answer, reusing the area-attack warning), and whether Rampage can be hit in the air.

## Related pages

- [Enemies and AI](/wiki/systems/enemy-ai): the State Tree, attack selection, and how data phases and the boss tree divide the work.
- [Defense](/wiki/systems/defense): parryable, unblockable and dodge-only attacks, and the groggy gauge.
