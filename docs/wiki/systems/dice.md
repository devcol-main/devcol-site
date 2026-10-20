---
title: "Dice: 2d6, Grades and Reversal"
description: "How PSEUDO's main combat resource works: pips earned by perfect play, a 2d6 roll judged by five grades, three dice types, the All-in roll, Reversal on bad rolls, and the bad-luck stack that guarantees a critical success."
publishAt: 2026-10-20
outline: deep
---

# Dice: 2d6, Grades and Reversal

Dice are PSEUDO's main combat resource. You charge them by playing well, spend them to roll 2d6, and the roll decides how strong the effect is. This page covers the whole loop: how dice are earned, how a roll is judged, what each type of die does, and what happens when a roll goes badly.

All effect sizes on this page are placeholders that live in a DataTable and will change in playtesting. The probabilities won't.

## The loop

```
Hits, perfect inputs, perfect parries and dodges → pips (max 3)
→ spend a pip → roll 2d6 → Attack / Curse / Guard effect
→ a bad roll adds a bad-luck stack → Luck goes up
→ higher Luck widens the perfect-input windows → more perfects → pips come back faster
```

A **pip** is one stored die. You hold up to three. Landing hits fills them slowly, and perfect inputs (a combo input on the beat, a parry or dodge at the last moment) fill them fast. That's the link between skill and luck: you don't get better rolls by playing well, you get *more* rolls.

There's a short minimum cooldown between rolls so the key can't be spammed, but pips, not cooldowns, are what limit you.

## Why 2d6 and not one die

With one d6, every face is 1 in 6. A roll of 1 is as likely as a 4, and the result swings wildly. With two dice the sum clusters around 7:

| Sum | Grade | Chance |
|---|---|---|
| 2 | Critical failure | 2.8% (1/36) |
| 3–5 | Failure | 25.0% (9/36) |
| 6–8 | Normal | 44.4% (16/36) |
| 9–11 | Success | 25.0% (9/36) |
| 12 | Critical success | 2.8% (1/36) |

Two things fall out of the curve:

- **The middle is reliable.** Seven in ten rolls land Normal or better. A player can plan around a roll without being able to count on one.
- **Bonuses feel earned.** A +1 to the sum shifts a lot of probability across a grade boundary, because the boundaries sit on the steep part of the curve. A skill-tree node that adds +1 is a visible upgrade, not a rounding error.

Results are keyed by **grade**, not by sum. The DataTable has one row per (type, grade) pair, so a sum of 9 and a sum of 11 give the same Success effect. That keeps the table small (15 rows plus doubles) and keeps each grade's identity clear.

### Doubles

When both dice show the same face, the roll gets a bonus effect on top of its grade. Doubles come up 1 in 6, so they're a small, frequent reward. Double sixes are a Critical success *and* a double.

### The first roll

The first roll in the game is scripted to be a Critical success. The player sees the best case before anything else, so they know what they're chasing.

## Three types

There is one roll key. A second key cycles which type of die you're about to roll.

| Type | What it does | Examples |
|---|---|---|
| **Attack** | Buffs you | Attack power, attack speed, skill damage |
| **Curse** | Debuffs an enemy | Slow, attack or defense down; confusion, stop or sleep at high grades |
| **Guard** | Protects you | Damage reduction, shield, healing |

Their double bonuses differ: an Attack double makes every hit a critical for the buff's duration, a Curse double also hits one nearby enemy, and a Guard double adds an extra shield.

The types unlock in order: **Attack** in the tutorial, **Curse** in Stage 1, **Guard** in Stage 2. Each new type arrives once the player is comfortable with the last one.

### Why one key instead of four

An earlier draft had four dice skills on Q, E, R and F, each with its own cooldown. It went through two problems:

1. **The keys around WASD were already taken.** Guard sits on E, interact on F, potion on Q. Four dice keys meant moving core actions to awkward places.
2. **Four cooldowns is four timers to watch** in a game that's about watching the enemy.

One roll key plus a type cycle uses two keys for the whole system. With three types, any type is at most two presses away, and the HUD shows the current type and the next one. Cycling is a free action, so you can switch mid-combo.

I'm also tracking a metric for this: if playtesters press the cycle key more than two or three times a minute, the types are too situational and need redesigning. The intent is that you pick a type per fight (strategy) and roll when the moment is right (tactics).

## Input

| Input | Action |
|---|---|
| Roll key, tap | Roll 2d6 of the current type (costs 1 pip) |
| Roll key, hold | Fills a gauge over about a second, then rolls **All-in** |
| Release during the hold | Cancels; nothing is spent |
| Attack, dodge or parry during the hold | Cancels the gauge (you can still move) |
| Cycle key, tap | Next type |
| Cycle key, hold | Radial menu of all types (no slow-motion, because of multiplayer) |

With fewer than three pips the hold gauge is greyed out and won't fill.

## All-in

All-in spends all three pips on **one** 2d6 roll, and that roll's grade applies to Attack, Curse *and* Guard at once. A Success is a Success three times over. A double gives all three double bonuses.

It's a real all-in: a Critical failure applies all three penalties. That's what makes it a decision rather than a button you press whenever you have three pips. All-in is a skill-tree unlock, not something you start with.

## When a roll goes badly

Low rolls aren't just a loss. A Failure or Critical failure comes with a penalty **and a Reversal**: a short challenge with a timer that, if you complete it, turns the penalty into a strong bonus.

| Type | Critical failure | Reversal condition | Reversal effect |
|---|---|---|---|
| Attack | Attack −20% | 3 perfect inputs | Attack **+60%** |
| Curse | The curse hits *you* (move −20%) | 1 kill | A strong curse spreads to nearby enemies |
| Guard | Vulnerable (damage taken +20%) | 1 perfect parry | Big heal and a shield |

A Failure works the same way with a weaker penalty and a weaker Reversal. Between them, about 27.8% of rolls (10 in 36) carry a Reversal chance.

On an All-in Critical failure, meeting **any one** of the three conditions reverses all three penalties at once.

The balance target is that the expected value of a Failure, counting the chance of reversing it, is about the same as a Normal. A bad roll should feel like a turn in the fight, not a punishment. The Reversal UI puts the condition and timer front and center so the player knows exactly what to do.

## The bad-luck stack

Every Failure or Critical failure adds a visible **bad-luck stack**, and each stack does two things:

1. **Raises Luck for a while.** Luck widens the timing windows for perfect inputs, which makes the Reversal you were just handed easier to land.
2. **Counts toward a guarantee.** At a set number of stacks (three, to start), the next roll is a guaranteed Critical success, and the stack resets.

An earlier draft had a hidden pity counter and a separate "low roll raises Luck" rule. Merging them into one visible stack is simpler to explain and gives the player something to look forward to after a bad streak.

## Upgrades

Dice upgrades sit in a shared "Dice" branch of the skill tree:

| Node | Effect |
|---|---|
| All-in | Enables the hold-to-roll All-in |
| Advantage | Roll 3d6 and keep the highest two |
| Re-Roll | Re-roll a result; cost and charges depend on the node's rank |
| Roll bonus | +1 to +2 on the sum |
| Bad-luck stack | Fewer stacks needed for the guaranteed Critical success |

Advantage changes the curve a lot. Keeping the best two of three d6 pushes the average sum from 7 to about 8.5, and Success-or-better goes from about 28% to roughly half of all rolls.

## Difficulty

There are two difficulties, and dice are where they differ most.

- **Story**: every roll is at least Normal.
- **Real**: worse odds (a Disadvantage-style roll or a −1 to the sum), most of the UI stripped down to the dice faces, and enemies roll dice too.

## Under the hood

A few implementation decisions, because they shape the design:

- **Rolls happen on the server.** Single player runs as a one-player listen server, so the same code serves the multiplayer arena. The client shows the result after it replicates.
- **The random source is a seeded stream** (`FRandomStream`), not a fresh random call each time. With the same seed, you get the same sequence of rolls.
- **Pips are a Gameplay Ability System attribute** in a dedicated dice attribute set, and each roll's effect is applied as a Gameplay Effect whose magnitude comes from the DataTable row for that type and grade.
- **The bad-luck stack lives on the server** alongside the roll, so it can't drift between clients.

## No real money near the dice

PSEUDO has gambling-shaped mechanics, so one rule is fixed: dice, rolls and re-rolls are never sold. Everything here is earned in play.
