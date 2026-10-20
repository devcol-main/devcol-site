---
title: "Elements and Reactions"
description: "PSEUDO's ten damage elements, resistances and immunity, status buildup, element shields and weakness breaks, the aura-and-trigger reaction table with its internal cooldown, and how elements connect to perfect inputs, dice and the skill tree."
publishAt: 2026-10-23
outline: deep
---

# Elements and Reactions

PSEUDO has Physical damage plus nine elements. Each element does something on its own, and two elements meeting on the same enemy can set off a reaction. The idea is the third combat pillar: **elements create combos across systems**. A weapon hit, a dice roll, a pet and a skill can each put an element on an enemy, and the reward goes to mixing them.

This page covers the elements, resistances, status buildup, shields, and the reaction table. Numbers are first values, kept in data.

## The ten

| Element | Solo effect | Role |
|---|---|---|
| Physical | None (armor applies) | The base. Triggers Shatter |
| Fire | Burn: damage over time, doesn't stack | Sustained damage |
| Ice | Slow, then Freeze when it builds up | Control |
| Poison | Damage over time that **stacks**, reduces healing | Sustained damage |
| Earth | Extra poise damage | Breaking guard |
| Lightning | Chains to 1–2 more enemies, makes them flinch | Groups |
| Water | Wet | Fuel for reactions |
| Wind | Knockback, launch | Crowd control, spreading |
| Light | Mark (crits more likely), cleanse | Support |
| Dark | Erosion: lowers resistance and max HP | Breaking immunity |

Water barely does anything alone. That's on purpose: it exists to make other elements stronger.

## Resistances

Every character has one resistance per element. Resistance multiplies damage by `(1 − Resist)`:

| Resist | Effect |
|---|---|
| −0.5 | Weak: +50% damage |
| 0 | Normal |
| 0.5 | Half damage |
| 0.75 | The cap: no stacking goes past this |
| 1 or more | **Immune**: zero damage, zero buildup |

Negative resistance goes down to −1. Immunity can only be broken by lowering the resistance, which is what Dark's Erosion and the Corrode reaction are for. An immune enemy is a puzzle, not a wall.

Enemy resistances come from a CSV table with one column per element, one row per enemy type.

### Adding an element changes no code

Each element is a data asset that names its tag, color, icon, effects, and which resistance attribute and buildup attribute belong to it. The damage calculation reads resistances by going through the element definitions, not by listing them in code. A new element is a new data asset and a new column in the table.

## Status buildup

Elemental hits don't apply a status on contact. They fill a gauge, Elden Ring style:

1. Each hit adds its element gauge × `(1 − Resist)` to the target's buildup for that element.
2. When the buildup reaches the threshold (100), it resets and the status triggers.
3. All buildups decay over time (10 per second), so a status needs steady pressure.

A **perfect input doubles the gauge** of that hit. That's one of the three rewards for timing, next to the damage stack and dice charge.

### Poison, the first status

Poison is the first status in the build, and it's the template for the rest:

- 2 damage per stack per second, up to 5 stacks, for 6 seconds.
- A new proc adds a stack and refreshes the duration. When the duration runs out, one stack drops, not all of them.
- Damage over time ignores crits, armor and the bonus bucket. It's `damage per stack × stacks × (1 − Resist)`.
- It's removed on death.

While testing it I found that the engine multiplies a periodic effect's output by its stack count on its own, so five stacks did 50 damage instead of 10: my formula already multiplied by stacks. Telling the engine I handle stacks myself fixed it.

## Element shields

Some enemies carry an element shield with a weakness. While the shield is up, hits go to it first:

| Hit | Shield damage |
|---|---|
| The shield's weakness | ×2 |
| Anything else, Physical included | ×0.25 |

Whatever breaks through goes to health, at normal strength. When the shield hits zero the enemy is marked *shield broken*.

Test case: a dummy with a 30-point shield weak to Fire. A Physical hit takes 2.52 off the shield. A Fire hit takes 20.17. A Fire hit on a 7.31-point shield breaks it and puts 6.43 into health.

This is the "weakness break" for bosses: bring the right element, or chip at the shield for a long time. Bosses are planned with breakable parts that each have their own shield and weakness.

## Reactions

A reaction needs two elements: an **aura** already on the target and a **trigger**, the new hit.

- An aura is a timed effect with its own gauge that marks the target with `Element.Aura.<X>`.
- A reaction is a row in a sparse CSV table: aura, trigger, reaction, damage multiplier, how much gauge it consumes, and the effect or ability it fires.
- If a pair isn't in the table, the new element simply replaces the aura.

| Aura + trigger | Reaction | Effect |
|---|---|---|
| Ice ↔ Fire | Melt | Damage multiplier (stronger Fire on Ice) |
| Water + Fire | Vaporize | Damage multiplier |
| Water + Ice | Freeze | Short freeze |
| Frozen + heavy Physical | Shatter | Big damage, ends the freeze |
| Water + Lightning | Electro-charged | Chains between wet enemies |
| Wind + Fire / Ice / Water / Lightning / Poison | Swirl | Spreads the aura to nearby enemies |
| Light ↔ Dark | Collapse | The strongest reaction, from rare sources |
| Dark + Poison | Corrode | Lowers armor and resistance |

Shatter is the reason heavy attacks exist beyond raw damage: freeze something, then hit it hard.

A second set is planned for later: Poison + Fire Explosion (area damage), Earth + another element Crystallize (a shield for the player), Light + Lightning Flash (blind), Light Purify (removes an aura), Dark + Ice Void Freeze, Wind + Earth Sandstorm.

### The internal cooldown

Without a limit, a fast weapon reapplies its aura every hit and triggers a reaction every hit. The **internal cooldown (ICD)** stops that: the same attacker can't reapply an aura to the same target more than once per 0.5 seconds or every 3 hits. Finishers can be flagged to ignore it, so a combo's last hit can always land its element.

## Elements across systems

| Link | What it does |
|---|---|
| Perfect input | Doubles the element gauge of the hit |
| Luck | A successful Luck check resists an incoming status |
| Dice: Attack Success or better | Puts an element on your weapon for the buff's duration (the weapon's own, otherwise a random one) |
| Dice: Curse Normal or better | Applies an aura to the target, ready for a reaction |
| Dice: a Curse Reversal | "Spreads to nearby enemies" reuses Swirl's spreading logic |
| Skill tree augments | Change one attack's element, e.g. a fire finisher |
| Just guard | Guarding an elemental attack at the last moment loads that element into your counter |
| Pet | Applies auras for you to trigger |
| Environment | Puddles conduct lightning, grass burns, poison swamps (later) |

When several sources want to set the element of the same hit, the order is: **skill-tree augment > dice imbue > weapon default**. A pet's element stays on the pet's own hits.

See [Dice](/wiki/systems/dice) for how rolls are graded.

## Status

In the build and tested with a host and a client: an element on every hit (from the weapon or the attack), all ten resistances with the cap and immunity, status buildup and decay, Poison, and element shields with overflow. The reaction table, auras, the internal cooldown, Elemental Mastery and the other statuses come in Stage 2.
