---
title: "Defense: Guard, Parry, Dodge and the Perfect Window"
description: "How PSEUDO resolves an incoming hit: the defender's resolve chain, guard, parry and perfect parry, dash and perfect dodge, what each perfect earns, how Luck widens the windows, groggy, and why slow motion never slows the player's own timing."
publishAt: 2026-10-21
outline: deep
---

# Defense: Guard, Parry, Dodge and the Perfect Window

Defense in PSEUDO isn't just about not getting hit. A well-timed parry or dodge is the fastest way to charge dice, so the defensive side of combat feeds the offensive side directly. This page covers what happens when an enemy attack reaches you, what each defensive action does, and what a *perfect* one earns.

All window lengths are first drafts that will be tuned in playtesting.

## The resolve chain

When a hit arrives, the game checks the defender's options in a fixed order and stops at the first one that applies:

```
just dodge → just guard (parry) → guard → damage → groggy gauge → reaction
```

1. **Just dodge**: you dashed at the last moment. The hit misses and you get the perfect-dodge reward.
2. **Just guard**: you pressed guard at the last moment. The hit is parried.
3. **Guard**: you were holding guard. Damage is reduced.
4. **Damage**: nothing stopped it. Health goes down (bosses route this to the body part that was hit).
5. **Groggy gauge**: the hit builds the target's poise damage.
6. **Reaction**: stagger, knockback, knockdown or launch, depending on the attack.

Writing it as one chain matters because every defensive feature becomes "insert a step" rather than "add a special case." Fall damage uses the same shape: break-fall, then a Luck check, then damage.

## The actions

| Action | Window (draft) | Reward |
|---|---|---|
| Guard | While held | Damage reduction |
| Parry | About 200 ms after the press | Lowers the enemy's groggy gauge |
| **Perfect parry** | About 80 ms before the hit lands | Big groggy damage, a counter attack, **dice pip charge** |
| Dodge (dash) | About 250 ms of invulnerability | Avoids the hit |
| **Perfect dodge** | About 100 ms before the hit lands | A counter attack, a short slow motion, **pip charge**, a partial ammo / mana refill |

Guard and parry share one button (L1 on a gamepad, E on PC). Pressing it starts the guard and the parry timing check at the same moment, so there's no delay to decide whether you meant to guard or parry. Holding keeps guarding.

Dash is on its own button and comes out on press, never on release, so the perfect-dodge timing stays exact. On PC, keeping Shift held after the dash turns into a sprint.

## What "perfect" earns

A perfect parry or perfect dodge does three things beyond avoiding the hit:

- **Opens a counter.** The character carries a short `State.Perfect.Parry` or `State.Perfect.Dodge` tag, and the combo graph has a transition that requires it. Press attack right after and you get a counter attack instead of the first hit of a normal combo. It's the same tag-gated transition the combo system uses everywhere (see [Combos and Cancels](/wiki/systems/combo-and-cancels)).
- **Charges dice.** Pips are the main combat resource, and perfect defense is one of the fastest ways to earn them. An earlier draft said a perfect dodge would shorten the dice cooldown. Once dice moved from cooldowns to pips, that became a pip charge.
- **Feeds the same damage bonus as perfect attacks.** Attack perfects and defense perfects share one stack. Taking a hit resets it.

## Luck widens the window

Luck is the stat that makes timing easier. Higher Luck adds a little time before and after every perfect window, for combo inputs and for defense alike, with one global rate and a cap per window.

That's the bridge between the dice and defense. A bad dice roll adds a bad-luck stack, each stack raises Luck for a while, and higher Luck makes the next perfect parry easier to land, which is often exactly what the Reversal from that bad roll asks for. The [Dice](/wiki/systems/dice) page covers the other half of that loop.

A Luck check also decides two other things on the defense side: whether fall damage is negated, and whether a status effect is resisted.

## Groggy

Every attack carries a poise damage value. Enough of it fills the target's groggy gauge and leaves them open. Three things feed it:

- **Vitality** raises your own poise, so you're harder to stagger.
- **Strength** and **Earth** damage raise poise damage on your hits.
- **Parries** lower the enemy's gauge, and a perfect parry lowers it a lot.

Parrying is therefore a way to break a strong enemy, not just a way to survive one.

## Reading enemy attacks

Enemy attacks are tagged as one of three kinds, and the attack shows which:

| Kind | Guard | Parry | Dodge |
|---|---|---|---|
| Parryable | Yes | Yes | Yes |
| Dodge only | No | No | Yes |
| Unblockable | No | No | Yes, and it's the only option |

The point is that the player always knows which defensive tool the moment calls for. A fight shouldn't be a guess about whether a parry would have worked.

## Slow motion without slow controls

A perfect dodge triggers a brief slow motion. PSEUDO handles all time effects through one subsystem with a request stack: several effects can ask for slow motion at once, the slowest wins, and when one ends the next one takes over.

In slow motion the world slows down and the player is compensated so they move at normal speed. Two rules come out of that:

- **Cooldowns and effect durations follow world time**, even during slow motion. If they followed the player's speed, you could chain abilities indefinitely inside the slow motion.
- **Player actions are timed with animation markers, never with timers.** A timer would slow the player down along with the world. An animation marker plays at the player's speed, so parry windows and cancel windows mean the same thing inside and outside slow motion.

In multiplayer only shared moments slow the whole world. Personal effects like a perfect-dodge slow motion use camera and post-processing effects instead, so one player's dodge doesn't slow everyone else.

## Planned extras

These are designed but come after the vertical slice:

- **Element counters.** Just-guarding an elemental attack loads that element into your counter attack.
- **Air dash.** A skill tree unlock that reuses the same dash ability in the air.
- **Guard counter.** A dedicated attack from a held guard.

## Status

Combat was split into a sequence of issues: combo, hit detection and damage, then defense. The combo and damage work is in the build. Defense is the next combat issue, so this page describes the decided design rather than tested behavior. Dash details (the direction with no stick input, the cooldown, and whether a dash can cancel anything or only inside a window) are decided in that issue, and I'll update this page when they are.
