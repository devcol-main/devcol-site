---
title: "A Server-Rolled 2d6 Dice Ability in UE5 GAS: Pips as an Attribute, a Throw Notify, FRandomStream and a DataTable of Effects"
description: "How I built PSEUDO's dice mechanic with the Gameplay Ability System in Unreal Engine 5: a pip attribute clamped in both PreAttributeChange and PreAttributeBaseChange, a LocalPredicted roll ability that spends nothing until the server reaches a throw notify, a seeded FRandomStream, results and Reversal conditions in a DataTable, plus two traps: an Abstract anim notify class that never saved, and MultiplyAdditive taking a factor."
date: 2026-11-17
workedOn: 2026-10-20
publishAt: 2026-11-17
track: "Dice"
category: "Build Logs"
sidebar: "Dice Roll Ability"
image: /blog/pseudo-dice-roll-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Data, Multiplayer, C++]
---

# A Server-Rolled 2d6 Dice Ability in UE5 GAS: Pips as an Attribute, a Throw Notify, FRandomStream and a DataTable of Effects

PSEUDO's main combat resource is a pair of dice. Perfect inputs earn pips, a pip buys a 2d6 roll, and the total decides how strong an Attack, Curse or Guard effect is. This post is how that was built on the Gameplay Ability System so it works the same for a remote client as for the host. If you are building any random, resource-costing ability in GAS, the parts worth taking are: keep the resource in an attribute set clamped on both current and base value, let the client start the animation but have the server roll at a notify inside it, roll from a seeded `FRandomStream` on the server only, and keep every effect and condition in a DataTable so tuning never touches code.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-dice-roll-c.jpg" alt="Pips are spent and the server rolls only when the montage reaches its throw notify." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-dice-roll-c-dark.jpg" alt="Pips are spent and the server rolls only when the montage reaches its throw notify." loading="lazy">
</figure>

The rules themselves (the five grades, what each die type does, Reversal, the bad-luck stack and why 2d6) are on the wiki's [Dice](/wiki/pseudo/systems/dice) page. Here I only repeat what the implementation needs.

## Pips live in an attribute set

A pip is one stored die, up to three. I made them a GAS attribute pair, `Pips` and `MaxPips` (3), in their own set, `UPseudoDiceSet`, so costs, HUD bindings and "can I afford this?" checks use the same machinery as health or stamina.

The clamp is in two places, `PreAttributeChange` and `PreAttributeBaseChange`. The second one matters: pips are charged by an **instant** gameplay effect (`GE_DicePips`, SetByCaller amount), and instant effects change the base value, which `PreAttributeChange` alone doesn't see.

Pips come only from perfect play. The dice component listens on the player's ability system component for three gameplay events: a perfect combo input, a perfect dodge and a perfect parry. Each one applies the pip effect. In the test, three perfect combo inputs took the pips from 1 to 3 and the fourth left them at 3.

How many pips a player starts with is a setting: three in single player and one in multiplayer, granted once per player state at the first possession. "Multiplayer" is decided by the player count at that moment, so a listen host counts as single player until a lobby decides the mode.

## Where the dice state lives

Everything else is in `UPseudoDiceComponent`, which sits on the **player state** rather than the pawn.

The component does different jobs on different machines:

- **Server**: holds the random stream, rolls, applies result rows, runs the Reversal window, counts the bad-luck stack and turns it into Luck, charges pips from the perfect events.
- **Owning client**: reads the R key itself and decides between a tap and a hold in real time (tap under 0.25 s, All-in hold 1 s), then sends the matching input tag (`InputTag.Dice.Roll` or `InputTag.Dice.RollAll`) into the ability system. The G key cycles the die type locally and tells the server with an RPC.
- **Replicated**: the current type (skipping the owner, who already knows it), the bad-luck stack, the last roll (with a serial number), and the active Reversal.

## The roll waits for the throw

The roll is a gameplay ability, `UPseudoGameplayAbility_DiceRoll`, with an All-in variant, both **LocalPredicted** so the throw animation starts on the press.

The client sends a small target data struct with the die type and, for a Curse, the target (the lock-on target, else the soft target). The server checks it: is that type unlocked, are there enough pips, and is the Curse target alive and within `DiceCurseRange`. A Curse with no target is refused before anything is spent.

The important decision was **when** to pay. `CheckCost` only asks whether pips ≥ cost (1 for a roll, 3 for All-in). The cost and the 0.5 s cooldown are committed on the server when the montage reaches a throw notify, which sends `Event.Dice.Throw`, and the roll happens at the same moment. The roll montage puts that notify about 0.48 s after the start.

That gives a clean cancel rule. Dash, guard and attacks cancel the roll (it has the tag `Ability.Dice`), and a cancel before the throw costs nothing. In the test, a dash 0.2 s after pressing R logged "cancelled before the throw" and the pips stayed. A roll that reached the notify went `[client] roll start` → `[server] roll start` → `rolled`, both machines went from 3 pips to 2, and the client's result cue showed the same grade the server rolled.

The roll is blocked during hit frames, during a dash, during another roll and during a weapon swap; in those cases the press is buffered for 0.3 s. It cancels the combo and the guard.

All-in, the three-pip roll that applies one result to all three types, adds `State.Dice.AllIn`, which locks movement in the character's move input and switches the camera to a closer mode. Its gauge only fills with three pips and the unlock, and releasing early, attacking or dodging cancels it with nothing spent.

<figure>
  <img src="/blog/pseudo-dice-hud-01.jpg" alt="Gameplay view with the dice panel in the lower right showing the die type ATTACK, the next type CURSE, three pip bars and the ALL-IN gauge." loading="lazy">
  <figcaption>The dice panel at the lower right: current type (ATTACK, G cycles to CURSE), three pip bars, and the All-in gauge under them while R is held.</figcaption>
</figure>

## One random stream, on the server only

The server rolls from an `FRandomStream`. A `DiceSeed` setting picks the seed, and 0 means a new one per session. Clients never roll, so there is nothing to keep in sync except the result, which replicates in the last-roll struct.

Two rules sit on top of the raw roll:

- **The first roll of the game is always a critical success.** The test's first roll logged `6 + 6 (guaranteed)`.
- **The bad-luck stack.** A bad roll adds a stack, each stack raises Luck through an effect, and after a set number of stacks the next roll is a guaranteed critical success and the stack resets. The test went stack 1, 2, 3, Luck 30 on the client, then `12 (guaranteed)`, stack 0, Luck 0.

Luck is also what widens the perfect windows, so it feeds back into pips. A helper, `LuckPerfectFactor`, turns Luck into 0 to 1 (Luck over 50), and the combo and defense code scale their bonus windows by it. For combo inputs only the trailing side is done so far: the perfect window stays open a little after its notify ends. Opening it earlier needs a delayed judgement and is still open.

<figure>
  <img src="/blog/pseudo-dice-hud-02.jpg" alt="An All-in roll of 6 and 6: a centre banner reads ALL-IN 6 + 6, CRITICAL SUCCESS x DOUBLE, and the panel shows the two dice and the word guaranteed." loading="lazy">
  <figcaption>An All-in roll with a guaranteed critical success. The banner and the panel both come from the replicated last-roll struct, so the client shows the server's result.</figcaption>
</figure>

## Results are rows, not code

Every possible outcome is a row in a DataTable, `DT_DiceResults`, imported from a CSV. The row name is `<Type>_<Grade>`, which gives 15 rows for three types and five grades, plus 3 rows for doubles.

A row holds a list of effects, each with a kind, a target (self, the Curse target, nearby enemies), a magnitude, a duration and an optional status tag. Each kind maps to a native gameplay effect class that carries the asset tag `Dice.Effect`. A row can also hold a Reversal: an event tag, a count, a time limit, a label and its own effects. If the matching events arrive in time, the bad effect is removed and the Reversal effect applied. In the test, a failed Attack roll followed by two perfect inputs removed its −0.1 and applied +0.4.

The damage side needed a few hooks for those kinds to mean anything: melee and ranged damage bonus buckets that may go down to −0.9, a source tag `Dice.Buff.GuaranteedCrit` the damage execution reads as a forced crit, a new `DamageTakenBonus` term at the end of the formula, and a `Barrier` attribute that absorbs health damage one to one and is cleared when the last barrier timer ends. A kill now sends `Event.Combat.Kill` to the instigator, because one Curse Reversal is "get a kill".

A cheat, `PseudoDiceForce <a> <b>`, forces the next roll, which is how all 18 rows were checked. Examples from that pass: a normal Curse took an enemy's Defense from 20 to 16 and its movement to ×0.7; a Curse critical success multiplied Defense by 0.6 and Attack Power by 0.7; Guard rows put a barrier or a heal on the player. All three Reversal types were tested, including a Curse Reversal completed by a real kill, and a timed-out Reversal logged "missed" after 8 s.

## Two bugs worth knowing about

**`MultiplyAdditive` takes a factor.** The Curse rows store values like −0.2 ("20 % less Defense"). Passed straight into a modifier with the MultiplyAdditive operation, that −0.2 zeroed Defense and Attack Power. The component now passes 1 + value. If a percentage debuff in your project wipes a stat out, check whether you're handing a delta to an operation that wants a multiplier.

**An Abstract notify class works until you restart the editor.** After all the tests passed, rolls started but never rolled after an editor restart. The throw notify placed in the montages was the C++ notify class itself, which is marked `Abstract`. It ran fine in memory, so every test passed, but it was never saved into the montage, so after the restart there was no notify and no `Event.Dice.Throw`. I replaced it with a Blueprint child, `ANS_PseudoDiceThrow`, and checked it in the saved files and in PIE (`rolled 6 + 6 ...`). If a notify-driven ability stops working only after a restart, look at the montage on disk, not in the editor session.

The same work fixed an older gap: the move speed multiplier attribute had never been applied to anything. Now every machine sets `MaxWalkSpeed` to base × multiplier, for players and enemies alike.

## Doing this in your own project

- Make the spendable resource an attribute and clamp it in **both** `PreAttributeChange` and `PreAttributeBaseChange`, or instant effects will slip past the clamp.
- In a predicted ability that should be cancellable, check the cost on activation but **commit** it at a notify in the montage, on the server. The client gets an immediate animation and a cancel before the notify is free.
- Roll on the server from an `FRandomStream` with a settable seed, and replicate only the result.
- Put outcomes in a DataTable whose effects map to a small set of native gameplay effect classes. Adding a row is then a CSV edit and a reimport.
- Use Blueprint children of notify classes in montages, never the abstract C++ class.

## Tested, and what's still open

Everything above ran on a listen server with one client rolling, with no `ClientActivateAbilityFailed` and no dice warnings or errors. With two players there was no slow motion on All-in; solo got the short 0.3 time dilation for 0.2 s.

Open items: the roll clips are full-body and the animation blueprint has no upper-body slot yet, so a tap roll roots the player for now. The HUD is a code-built placeholder. The first-roll rule is per session until there is a save. Unlocks come from a default list until the [skill tree](./2026-11-16-pseudo-skill-tree-progression-gas) grants them, and the multiplayer start pips should come from a lobby setting rather than the player count.
