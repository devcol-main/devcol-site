---
title: "Defense: Guard, Parry, Dodge and the Perfect Window"
description: "How PSEUDO resolves an incoming hit: the defender's resolve chain, guard, parry and perfect parry, dash and perfect dodge, what each perfect earns, how Luck widens the windows, groggy and hit reactions, break-fall, and why slow motion never slows the player's own timing."
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
5. **Groggy gauge**: the hit's poise damage fills the target's groggy gauge.
6. **Reaction**: flinch, stagger, knockback, down or launch, depending on the attack and on how much the target resists.

Writing it as one chain matters because every defensive feature becomes "insert a step" rather than "add a special case." Fall damage uses the same shape: break-fall, then a Luck check, then damage.

## The actions

| Action | Window (draft) | Reward |
|---|---|---|
| Guard | While held | Damage reduction |
| Parry | About 200 ms after the press | Adds 20 to the attacker's groggy gauge |
| **Perfect parry** | About 80 ms before the hit lands | 50 groggy and a stagger on the attacker, a counter attack, **dice pip charge** |
| Dodge (dash) | 350 ms of invulnerability | Avoids the hit |
| **Perfect dodge** | The first 120 ms of the dash | A counter attack, a short slow motion, **pip charge**, a partial ammo / mana refill |

Guard and parry share one button (L1 on a gamepad, E on PC). Pressing it starts the guard and the parry timing check at the same moment, so there's no delay to decide whether you meant to guard or parry. Holding keeps guarding.

Dash is on its own button and comes out on press, never on release, so the perfect-dodge timing stays exact. On PC, keeping Shift held after the dash turns into a sprint.

A dash with no stick input is a backstep in combat and a forward dash out of combat. Stepping back is almost always what you want when an enemy is in your face; out of combat, a dash is just a way to move faster. The dash has a 0.6 s cooldown and covers about 450 units in 0.35 s.

Guarding with the weapon stowed draws the melee weapon instantly, with no draw animation. A guard press that has to wait for a draw is a guard that comes too late.

## How the timing is judged

Parry and dodge windows are a fraction of a second, and in multiplayer the client and server don't agree on what "now" is. If the server judged a parry by checking whether the defender had a guard tag at the moment the hit landed, a client with 80 ms of latency would effectively have an 80 ms shorter window.

So the server judges by **timestamps**, not by state at hit time:

1. When you press dash or guard, your client records the press time on the server's clock and sends it with the ability activation.
2. The server clamps that time to the last 0.15 s. That's the grace period: it covers ordinary latency and favors the defender, but a client can't claim it pressed guard two seconds ago.
3. When an enemy hit lands, the server compares the hit time with the stored press times and walks the chain: dash invulnerability (perfect dodge if it's inside the first 120 ms) → perfect parry → parry → held guard → damage.

Because the parry window counts from the press, a quick tap still parries a hit that lands after you let go. Holding the button only matters for the plain guard.

## What "perfect" earns

A perfect parry or perfect dodge does three things beyond avoiding the hit:

- **Opens a counter.** The character carries a short `State.Perfect.Parry` or `State.Perfect.Dodge` tag, and the combo graph has a transition that requires it. Press attack right after and you get a counter attack instead of the first hit of a normal combo. It's the same tag-gated transition the combo system uses everywhere (see [Combos and Cancels](/wiki/systems/combo-and-cancels)).
- **Charges dice.** Pips are the main combat resource, and perfect defense is one of the fastest ways to earn them. An earlier draft said a perfect dodge would shorten the dice cooldown. Once dice moved from cooldowns to pips, that became a pip charge.
- **Feeds the same damage bonus as perfect attacks.** Attack perfects and defense perfects share one stack. Taking a hit resets it.

## Luck widens the window

Luck is the stat that makes timing easier. Higher Luck adds a little time before and after every perfect window, for combo inputs and for defense alike, with one global rate and a cap per window.

That's the bridge between the dice and defense. A bad dice roll adds a bad-luck stack, each stack raises Luck for a while, and higher Luck makes the next perfect parry easier to land, which is often exactly what the Reversal from that bad roll asks for. The [Dice](/wiki/systems/dice) page covers the other half of that loop.

A Luck check also decides two other things on the defense side: whether fall damage is negated, and whether a status effect is resisted.

## Groggy and hit reactions

What a hit does to your body is decided on two separate axes, the way Stellar Blade splits balance from super armor.

### Axis 1: the immediate reaction

Every attack carries a reaction tier, and every character has a resistance tier. The tiers, from weakest to strongest:

```
Flinch < Stagger < Knockback < Down < Launch
```

If the attack's tier is above the target's resistance, the target gets that reaction. If not, it only flinches: an additive twitch that doesn't interrupt anything. A grunt resists only Flinch, so the greatsword's normal swings stagger it and the finisher knocks it back. A heavy enemy with Launch resistance shrugs off everything short of that.

A real reaction cancels whatever the target was doing: a combo, a guard, a dice roll, a weapon swap or an enemy attack. Nothing else can start while it plays. A hit that an element shield absorbs completely never reaches health, so it doesn't cause a reaction either. The shield works as super armor.

### Axis 2: the groggy gauge

The second axis is a gauge, closer to Sekiro's posture. Every attack has a poise damage value that fills the target's gauge. Other sources fill it too:

| Source | Groggy |
|---|---|
| Greatsword normal swing | 10 |
| Greatsword finisher | 25 |
| Parry | 20 on the attacker |
| Perfect parry | 50 on the attacker, plus a stagger |
| Curse critical success (dice) | 60 |

A full gauge makes the target groggy for 4 seconds: its AI pauses and it takes 50 % more damage. Then the gauge resets. If nothing adds to it for 3 seconds, a partial gauge drains away. That means a groggy break needs steady pressure, and parrying is a way to break a strong enemy, not just a way to survive one. Vitality and Strength will feed the gauge (your own poise and your poise damage) once stats touch it.

The order on the server is fixed: damage, then wake a sleeping target, then groggy, then tier against resistance, then immunity, then the reaction itself.

### Reactions on the player

Players react too, and only the enemy attack's data decides how. The grunt's third swing knocks you down, so even a basic enemy can floor you if you stand in front of it. Two rules keep that from turning into a stun-lock:

- While you're lying down and getting up, you're invulnerable.
- For 1.5 seconds after getting up, nothing can do more than make you flinch.

### Break-fall

Pressing Jump right as you hit the ground cancels a Down or a Launch: you roll back to your feet instead of lying there. The window is 0.15 seconds, widened by Luck like every other timing window. It's judged the same way as a parry: the client predicts the break-fall at once and sends the press time and its contact time, and the server checks them against its own contact moment. In testing, a press 0.017 seconds before contact was accepted with 0.025 seconds of client lag; a press 0.73 seconds early was a miss and played the normal get-up.

The contact moment for a Down is a marker on the animation, so it lands on the same frame on every machine. I considered ragdolling the player on a Down and dropped it: there's no clean get-up from a ragdoll pose, the body drifts away from the capsule differently on each machine, and the break-fall moment would stop being a fixed frame.

## Reading enemy attacks

Enemy attacks are tagged as one of three kinds, and the attack shows which:

| Kind | Guard | Parry | Perfect parry | Dodge |
|---|---|---|---|---|
| Parryable | Yes | Yes | Yes | Yes |
| Unblockable | No | No | Yes | Yes |
| Dodge only | No | No | No | Yes |

Unblockable attacks punish a held guard and a lazy parry but still reward a perfect one. Dodge-only attacks are the ones where the answer is always to move. The point is that the player always knows which defensive tool the moment calls for. A fight shouldn't be a guess about whether a parry would have worked.

### Area attacks and the warning ring

Some enemy attacks hit an area instead of following a weapon. Before one lands, two circles appear on the floor: an outer ring at the full radius and an inner disc that grows until it touches the ring at the moment of impact. Each machine sizes the disc from the attacker's animation as that machine plays it, not from a timer, so the ring stays honest through lag, hitstop and an attack that gets interrupted. Everything in the circle goes through the normal chain above: a dash through it is an evade, a guard takes reduced damage. Enemy area attacks never hit other enemies.

The grunt's slam is the first one. Right now there's only about 0.3 s between the ring appearing and the hit, which is too short to react to, so it needs a longer windup and a larger radius in the tuning pass.

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

Dash, guard, parry, perfect parry and perfect dodge are in the build and were tested on a listen server with the client as the defender. Some numbers from that run:

- A dash 0.075 s before the hit was a perfect dodge, 0.125 s an ordinary evade, and 0.358 s took the hit, just past the 0.35 s of invulnerability.
- A guard tap 0.041 s before the hit was a perfect parry; 0.09 to 0.16 s was a parry; 0.21 s after a released tap took full damage.
- A held guard took 2.4 instead of 8 (the 0.3 guard multiplier) on three swings in a row.

Dash and guard cancel a combo at any point except the hit frames. A press during the hit frames waits in the input buffer and fires as soon as they end. Taking a hit resets the perfect stack.

Hit reactions, the groggy gauge (including parry and perfect-parry groggy) and break-fall are in the build as of 2026-10-21 and were tested the same way, on both machines. What's not done yet: the counter-attack state and the perfect-dodge slow motion, and an execution move on a groggy enemy. The Down reaction uses the last frame of a death clip until real knock-down and get-up animations exist. The guard pose is a held frame of a greatsword swing and the dash uses borrowed evade animations until the animation pass. Enemy attacks don't show their kind on screen yet.

Updated 2026-10-21: the defense issue is built. Added the real window lengths, the no-input dash direction, instant draw on guard, how the server judges timing, the corrected unblockable rule (a perfect parry still works) and test results.

Updated 2026-10-21: hit reactions and groggy are built. Added the two reaction axes, the tier list, the groggy numbers (4 s, +50 % damage taken, 3 s drain), player reactions with get-up invulnerability, break-fall, and enemy area attacks with their warning ring. Fixed the parry rows: parries fill the attacker's gauge, they don't lower it.
