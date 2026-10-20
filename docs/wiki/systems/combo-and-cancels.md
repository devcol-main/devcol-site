---
title: "Combos and Cancels: The Combo Graph"
description: "How PSEUDO's melee and ranged combos work: one combo graph per weapon walked by a single runner ability, tag-gated transitions, a multi-branch input buffer, cancel windows set on the animation timeline, skill chords, and combos that continue across a weapon swap."
publishAt: 2026-10-21
outline: deep
---

# Combos and Cancels: The Combo Graph

Every attack in PSEUDO, from the first light swing to a skill, is a node in a graph. This page covers how that graph is built, how an input decides which node plays next, how inputs pressed too early are remembered, and how an attack can be cut short by a dodge, a parry or a dice roll.

The design goal behind all of it is the first combat pillar: **timing is the core skill**. Pressing on the beat (a *perfect input*) is worth more damage, more element buildup and faster dice charge, so the combo system has to be precise about when an input counts.

## One graph per weapon

Each weapon has a combo graph asset, for example `DA_ComboGraph_Greatsword` or `DA_ComboGraph_DualPistols`. A graph has two parts:

- **Entry transitions**: where a combo can start (a light press from idle, a heavy press, an attack while dashing).
- **Nodes**: one per attack.

A node holds:

| Field | What it is |
|---|---|
| `NodeId` | An internal name such as `Light_3` or `Light_5_Finisher`. Only the graph uses it. |
| `NodeTags` | What other systems ask about: `Attack.Type.Light`, `Attack.Type.Finisher`, and so on. |
| Montage and section | The animation to play. |
| Attack spec | Damage multiplier, perfect-input bonus, play rate, element override and the rest. |
| Transitions | Where you can go from here. |

A transition is `{InputTag, RequiredTags, BlockedTags} → NextNode`. Transitions are checked in order and the first match wins, so specific transitions sit above general ones.

One gameplay ability, the combo runner, walks the graph. It doesn't know what a greatsword is. Adding a new attack means adding a node and a transition in data, not writing a new ability.

### Why a graph and not a list

A fixed list (A → B → C → D → E) is fine until the first branch. Light and heavy branches, an attack out of a dash, a counter after a perfect parry, a swap attack mid-combo: each of those is just another transition in a graph, and each would be a special case in a list.

## Transition tags: one mechanism, three uses

`RequiredTags` and `BlockedTags` are checked against the tags the character currently has. That single check covers three different systems with no extra code:

| Use | Example tag | Comes from |
|---|---|---|
| Situational attacks | `State.Dashing`, `State.InAir`, `State.Perfect.Parry` | Movement and defense abilities |
| Skill tree unlocks | `Unlock.Combo.Greatsword.HeavyBranch` | An Unlock node on the skill tree |
| Directional moves | `Input.Dir.Forward`, `Input.Dir.Back` | Lock-on input |

So "the heavy branch only exists after you learn it" and "this attack only comes out of a dash" are the same kind of rule. A transition can also be blocked by a resource cost, which is how a pistol attack stops when the ammo runs out.

### What the server checks

Combos are predicted on the client so they feel instant. The client sends which node it chose, and the server only checks that the transition exists. It doesn't re-check the tags, because tags arrive at slightly different times on each machine and a strict check would reject legitimate attacks.

## The attack catalogue

| Attack | Input | Condition |
|---|---|---|
| Basic combo, light and heavy branches | Light / Heavy | Inside the combo window |
| Charge attack | Hold Heavy | — |
| Dash attack | Light | Dashing or just finished a dash |
| Counter | Light | Right after a perfect parry or perfect dodge |
| Swap attack | Weapon swap | Inside the swap window mid-combo |
| Jump / air slam | Light / Heavy | In the air |
| Guard counter | Light | While guarding |
| Directional moves | Heavy | Forward = lunge, back = launcher, while locked on |
| Pause combo | Light | After a deliberate pause inside the window |

The first five are in the vertical slice. The rest come after it.

### The greatsword layout

The greatsword started as a straight five-hit light chain. Testing it showed that the first two swings barely reach anything, which is wrong for a light attack. They're becoming **heavy attacks with a launch**, and the light chain becomes the last three swings, ending in the finisher. The change is data only: different transitions and a heavy input on the first two nodes.

## Perfect inputs

Each attack animation has a short *perfect window* marked on its timeline. A press inside it:

- adds +0.1 to a damage bonus that stacks up to +0.5 and resets when you take a hit,
- doubles the element buildup of the hit,
- charges dice pips.

Luck widens the window, by up to a set number of seconds before and after it. Attack speed shrinks it, because a faster montage covers the same window in less real time, so there is a real-time minimum of about 80 ms. A buffered press (see below) never counts as perfect: perfect means you pressed on the beat, not early.

## The input buffer

If you press attack slightly before the next window opens, the game shouldn't drop it. PSEUDO keeps a short buffer of blocked inputs and retries them when they become valid.

Three ideas get mixed up a lot, so here's how I separate them:

| Term | Behavior | Used? |
|---|---|---|
| Input buffer | A short memory, the latest press wins | Yes |
| Input queue | First in, first out | No: it drifts behind the player |
| Multi-branch buffer | Keep one early press per input, resolve against the branches that exist when the window opens | Yes, for combos |

The combo buffer holds up to three early inputs, one per input type, for 0.2 seconds. When the window opens, the newest press that has a valid transition wins. Inputs the current node can't use go straight to their own abilities, so pressing dodge mid-swing isn't swallowed by the combo.

When several inputs land on the same frame, priority is:

**perfect defense > dodge > parry > dice > jump > next combo hit**

Defense comes first because missing a dodge costs more than missing a hit.

## Cancel windows

An attack can be cancelled only inside a cancel window, which is a marker on the montage timeline. The marker carries the cancel types it allows: `Cancel.Dodge`, `Cancel.Jump`, `Cancel.Parry`, `Cancel.Dice`, `Cancel.Skill`, `Cancel.Move`. A heavy swing might allow a dodge cancel early and everything only at the end.

All of this is timed with animation markers, never with timers. PSEUDO has a slow-motion effect on perfect dodges, and a timer would run at the wrong speed during it. An animation marker slows down with the animation, so the rules stay the same in slow motion.

### Moving during a swing

Melee attack clips have no root motion and play on the full body, so pushing the stick mid-swing makes the legs slide. The rule: movement is blocked or reduced during the swing, movement input during the recovery cancels the combo, and some swings get a short forward step. The greatsword doesn't use an upper/lower body split. Ranged weapons do, so you can walk while shooting.

## Skill chords

The keys around WASD are taken (guard, interact, potion, dice), so skills don't get their own buttons. Instead they're **chords**: hold a modifier and press an attack.

| | Gamepad | PC |
|---|---|---|
| Skill chord A | L1 + attack | Hold E + mouse button |
| Skill chord B | R1 + attack | Hold Left Ctrl + mouse button |

While the modifier is held, the character carries `Input.Modifier.SkillA` (or `SkillB`), and the skill's entry transition requires that tag. The modifier only matters for the first press; follow-ups are normal transitions, so you can let go. A skill is a combo branch like any other, which is why the skill tree can unlock and modify skills with tags (see [Dice](/wiki/systems/dice) for how the same tree holds the dice upgrades).

L1 is also guard. Pressing it starts guarding and the parry timing check immediately, and an attack pressed while it's held cancels the guard into the chord. A chord press that lands on an enemy attack still parries.

## Combos across a weapon swap

PSEUDO carries one melee and one ranged weapon. Swapping mid-combo doesn't restart the combo, it continues it:

> greatsword A → B → **swap** → pistol link attack → **swap** → greatsword C

How it works:

- **One runner for the whole combo.** The combo ability doesn't end on a swap. It handles the swap input itself, so the perfect stack and combo state carry over.
- **Swap-in transitions.** Each weapon's graph has entries for being swapped into mid-combo, optionally filtered by where you came from. Pressing swap at the right time plays the other weapon's link attack instead of a plain draw.
- **Resume on return.** The runner remembers the last node per weapon. Swapping back continues from the next node (C after B). A graph can define a dedicated return attack, which wins over resuming.
- **No draw animation mid-combo.** The link attack's animation carries the swap event that moves the weapons between hand and holster. The same server function does the swap whether it comes from a combo or from the plain swap key.

If the current node has no swap transition, the swap key just swaps weapons and ends the combo.

The same trick handles drawing a weapon. Out of combat nothing is drawn, and an attack press from that state is a **draw attack**: the draw and the first hit are one move.

## Targeting

Attacks turn the character a little toward an enemy so swings don't whiff on a target slightly to the side.

- **Without a lock**, an attack start gently turns you toward the nearest enemy in front, within a small radius and angle.
- **With a lock**, it turns you toward the locked target. Locking on is soft: the character and camera turn toward the target, then you keep free camera control with a gentle assist that keeps the target on screen. The enemy is never pulled toward you.

On PC the mouse wheel click locks on (and switches to the enemy closest to where you're looking if you're already locked); holding it releases. R3 does the same on a gamepad.

## Status

The combo graph, the runner, transition tags, perfect inputs and the buffer are in the build and tested on a listen server with a second client. The greatsword's five-hit chain works; the heavy branch, the swap attacks and the ranged graphs come with the ranged weapon work.
