---
title: "Damage Formula: From a Swing to Lost Health"
description: "The full damage formula in PSEUDO, term by term: base damage, stat scaling, attack multiplier, the additive bonus bucket, crits, resistance, reactions, armor and damage-taken modifiers, with worked examples measured in the build and how a hit is detected and validated."
publishAt: 2026-10-22
outline: deep
---

# Damage Formula: From a Swing to Lost Health

This page follows one hit from the moment the blade touches an enemy to the moment their health bar drops. It lists every term in the formula, where each number comes from, and worked examples that I checked against the running game.

Values are first numbers that live in spreadsheets and will move. The structure is what this page is about.

## The formula

```
Damage = Base
       × StatScaling
       × Multiplier
       × (1 + AdditiveBucket)
       × Crit
       × (1 − Resist)
       × Reaction × (1 + MasteryBonus)
       × Armor
       × (1 + DamageTakenMod)
```

| # | Term | What it is | Where the number lives | Current value | In the build |
|---|---|---|---|---|---|
| 1 | Base | The weapon's base damage | Weapon data asset | Greatsword 10 | Yes |
| 2 | StatScaling | `1 + (cSTR × STR + cDEX × DEX + cSPI × SPI) / 100` | Coefficients on the weapon, or on one attack | Greatsword: STR 1.0, so STR 10 → ×1.10 | Yes |
| 3 | Multiplier | How strong this one attack is | The combo node's attack spec | 1.0 on every node for now | Yes |
| 4 | AdditiveBucket | Every "+x%" bonus, summed | Perfect stack, melee damage bonus from STR, later the dice Attack buff | Melee bonus 0.10 at STR 10 | Yes |
| 5 | Crit | A crit roll on the server | Crit chance (from DEX) and crit damage (from LUK) | 7.5% chance, ×1.5 | Yes |
| 6 | Resist | The target's resistance to the hit's element | Enemy resistance table | Varies per enemy and element | Yes |
| 7 | Reaction, Mastery | Element reaction multiplier, Elemental Mastery | Reaction table | — | Later |
| 8 | Armor | `k / (k + Defense)` | Enemy stats table, `k` in project settings | Defense 20, k 100 → ×0.833 | Yes |
| 9 | DamageTakenMod | Dice Guard results on the target | Buffs and debuffs | — | With dice |

## The rule behind the shape

**Every "+%" bonus goes into one additive bucket. Only distinct mechanics multiply.**

If every bonus multiplied, two +30% buffs would make +69%, three would make +120%, and the numbers would run away as soon as buffs stack. Putting them in one bucket keeps stacking predictable: two +30% buffs are +60%. The perfect-input stack, the Strength bonus and the dice Attack buff all go in the bucket.

What multiplies is the stuff that should feel like a different kind of thing: a crit, an enemy's resistance, an elemental reaction, armor. Each of those has its own term so it can be read on its own.

There's one deliberate exception: **Strength counts twice**, once through the weapon's stat scaling on the base, and once through the melee damage bonus in the bucket. That's on purpose so Strength stays the obvious stat for melee builds, and both halves are tuned in data if it turns out too strong.

## Term notes

### The perfect stack

Each perfect input in a combo adds +0.1 to the bucket, up to +0.5. Taking a hit resets it. It's additive by design so it stacks predictably with everything else in the bucket.

### Crits

The crit roll happens on the server. Crit chance comes from a base value plus Dexterity, capped by a global maximum. Crit damage starts at ×1.5 and Luck raises it.

### Resistance

A resistance of 0.5 halves the damage of that element. A negative resistance is a weakness: −0.5 means 50% extra. Resistance is clamped between −1 and 0.75, so nothing is fully resistant through stacking. A resistance of 1 or more is different: it means **immune**, zero damage, and the only way through is to lower the resistance first (the Dark element does that).

The element of a hit comes from the attack if it overrides it, otherwise from the weapon. The calculation reads every resistance through the element definitions, so adding a new element doesn't touch the damage code. More on that in [Elements and Reactions](/wiki/systems/elements).

### Armor

Armor is `k / (k + Defense)` instead of a flat subtraction. A flat `damage − defense` makes weak hits do nothing against armored enemies. The ratio form always lets some damage through, and it has diminishing returns: the first 20 Defense matters more than the next 20. With `k = 100`, Defense 20 takes off about 17%, and Defense 100 takes off half.

## Worked examples

All with the greatsword, the default player at Strength 10, against a training dummy with Defense 20. "Seen" means I hit the dummy in the running game and the number matched.

| Case | Base | Scaling | Mult | Bucket | Crit | Armor | Damage | Seen |
|---|---|---|---|---|---|---|---|---|
| Normal hit | 10 | ×1.10 | 1.0 | 0.10 | ×1 | ×0.833 | **10.08** | Yes |
| One perfect | 10 | ×1.10 | 1.0 | 0.20 | ×1 | ×0.833 | **11.00** | Yes |
| Two perfects | 10 | ×1.10 | 1.0 | 0.30 | ×1 | ×0.833 | **11.92** | Yes |
| Crit | 10 | ×1.10 | 1.0 | 0.10 | ×1.5 | ×0.833 | 15.13 | Computed |
| STR 30, k = 20 | 10 | ×1.30 | 1.0 | 0.30 | ×1 | ×0.5 | **8.45** | Yes |
| Defense 50 | 10 | ×1.10 | 1.0 | 0.10 | ×1 | ×0.667 | **8.07** | Yes |

The last two rows test the data path, not the balance: I changed Strength with a cheat, changed the armor constant in project settings, and edited the enemy's Defense in the CSV and reimported it. Each change showed up in the next hit without touching code.

With elements, the same normal hit does 15.13 as Fire against a dummy weak to Fire (−0.5), 5.04 as Ice against 0.5 resistance, 2.52 as Lightning (0.9, clamped to 0.75), and 0 as Dark against an immune dummy.

## How a hit is detected

Damage only matters if the hit is real, so here's the path before the formula runs.

1. **The attacking machine detects.** During a hit window on the attack animation, the attacker sweeps four points along the blade, from its base socket to its tip, between the last frame and this one. A broad check finds nearby characters, then a narrow check against their physics bodies finds the bone and the impact point. Touching the capsule alone is a miss. Each target can be hit once per window.
2. **The server validates.** The attacker's report goes to the server, which checks that the attack is running, the target is alive and not already hit by this attack, the impact is within 350 cm of the attacker and 150 cm of the target, and the angle is within 120°.
3. **The server calculates.** One calculation function, on the server only, runs the formula. Clients never compute damage.
4. **Health changes in one place.** Damage goes into an incoming-damage value first, and the health set turns that into lost health. Shields, body-part health and death rules all sit at that one point.

Why the attacker detects instead of the server: on a listen server the server's copy of a remote player is a few frames behind, so a swing that clearly connected on the player's screen could miss on the server. Detecting locally and validating on the server keeps hits honest without making them feel laggy.

I also dropped a check I'd planned: verifying on the server that the hit landed inside the animation's hit window. Because the server copy runs behind, a strict check rejected legitimate early hits. "One hit per target per attack" replaced it.

This trust model is enough for co-op against AI. Before the PvP arena, the server needs more: a check that the impact is near its own copy of the blade's path, timing checks with tolerance, and a hits-per-attack limit.

## After the formula

Two things happen alongside the damage:

- **Element shields.** Some enemies have an element shield. While it's up, hits go to the shield first, at ×2 if the hit is the shield's weakness and ×0.25 otherwise. What breaks through goes to health.
- **Status buildup.** Elemental hits build a status gauge. When it fills, the status triggers. Poison, for example, deals damage over time per stack and ignores crits, armor and the bucket.

Both are covered on the [Elements and Reactions](/wiki/systems/elements) page.

## What's next for the formula

- **Dice**: the Attack buff joins the bucket, and Guard results (Vulnerable on a bad roll, damage reduction on a good one) fill the damage-taken term. See [Dice](/wiki/systems/dice).
- **Reactions**: the reaction multiplier and Elemental Mastery.
