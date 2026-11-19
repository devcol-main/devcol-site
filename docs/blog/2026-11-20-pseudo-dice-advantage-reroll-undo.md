---
title: "Undoing a Random Result in UE5 GAS: a Server-Checked Re-Roll Window and 3d6 Keep-Highest-Two Advantage"
description: "How I added two dice unlocks to a server-rolled GAS dice ability in Unreal Engine 5: Advantage (roll three dice from the same seeded stream, drop the lowest) and Re-Roll (press again within 0.5 s to take a result back). The roll records every effect handle it applied so the server can remove them, only fully reversible results can be re-rolled, the window is checked in real time on both machines with network slack, and the request is not predicted."
date: 2026-11-20
workedOn: 2026-10-22
publishAt: 2026-11-20
track: "Dice unlocks"
category: "Build Logs"
sidebar: "Dice Advantage and Re-Roll"
image: /blog/pseudo-reroll-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Multiplayer, C++]
---

# Undoing a Random Result in UE5 GAS: a Server-Checked Re-Roll Window and 3d6 Keep-Highest-Two Advantage

To let a player take back a random result in a multiplayer GAS game, the server has to know exactly what that result did and be able to remove all of it. This post shows how I did that for PSEUDO's dice: every roll keeps the handles of the effects it applied plus the state it changed, a result is marked re-rollable only if all of that can be undone, and the server checks the re-roll request against its own clock. The other unlock, Advantage, is the simpler half: a third die from the same seeded stream, lowest one dropped.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-reroll-c.jpg" alt="Each roll keeps the handles of what it applied, so the server can take it back." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-reroll-c-dark.jpg" alt="Each roll keeps the handles of what it applied, so the server can take it back." loading="lazy">
</figure>

## Where these two unlocks sit

PSEUDO's combat resource is a pair of dice. Perfect inputs earn pips, a pip buys a 2d6 roll, and the total picks an Attack, Curse or Guard effect from a DataTable. The server rolls from a seeded `FRandomStream` when the roll montage reaches its throw notify. That base system has its own build log: [A Server-Rolled 2d6 Dice Ability in UE5 GAS](./2026-11-17-pseudo-dice-roll-ability-gas). The player-facing rules are on the [dice wiki page](/wiki/pseudo/systems/dice).

This build added two skill tree nodes on top of it:

- **Advantage** (a passive node): roll 3d6 and keep the highest two.
- **Re-Roll** (an unlock node with three ranks): press R again within 0.5 s after a result to roll it again. It costs one pip, and you get as many re-rolls per fight as the node's rank.

## Advantage: one more die from the same stream

With the `Unlock.Dice.Advantage` tag, the server draws a third die from the same seeded stream it already used, and drops the lowest. The dropped die is stored on the roll (`DroppedDie`) and replicated with it, so the HUD can show which one was thrown away. The grade comes from the two kept dice. Rolls that a cheat forces and guaranteed 12s are left alone.

Because the extra die comes from the same stream and only on the server, nothing about Advantage needs to be predicted or checked. It is a few lines in the server roll function. The design doc also has a harder difficulty setting with a Disadvantage roll planned; it can reuse the same code and keep the lowest two.

## Which results are allowed to be taken back

The design question was what "take back" means. A Curse result might add groggy to an enemy. A Guard result might heal you. Those are instant effects: once applied, there is nothing to remove. If those could be re-rolled, a player could heal, re-roll, and heal again.

So I made a rule: only results that can be fully taken back can be re-rolled. Failures are made of timed penalties, so they always can. A result that healed or added groggy, or a guaranteed 12, cannot. In practice that is three rows of the results table: one Curse result (groggy) and two Guard results (heal). Every Attack result except the guaranteed 12 can be re-rolled. The HUD only shows `[R] Re-Roll (n)` on a result that qualifies, so the player is not offered something the server will refuse.

The check runs inside the server roll (`CheckUndoable`), so a new table row with a heal or groggy effect becomes non-re-rollable without any extra work.

## What a roll has to remember

To undo a result, the server needs a record of everything that result changed. Each roll now keeps:

- the handle of every timed effect it applied, including double bonus rows;
- the bad-luck stack value from before the roll (each failed roll adds a visible stack that raises Luck for a while);
- whether it opened a Reversal (the timed challenge a failed roll hands you, which turns the penalty into a bonus if you complete it);
- the target of a Curse;
- the real time it happened.

`bReRollable` is set from that record and replicated with the roll, along with `bReRolled` once it has been used.

When the server accepts a re-roll (`ReRollOnServer`), it works through the record:

1. removes the old effects by their handles;
2. closes the Reversal of a failed roll as cancelled, so it does not count as "missed";
3. puts the bad-luck stack back;
4. spends the pip and counts the charge;
5. rolls again with a re-roll flag, which skips the second slow-motion moment that an All-in roll would otherwise trigger.

Charges are the rank of the Re-Roll node minus `ReRollsUsed`. That counter is replicated to the owner only, and resets when a fight starts.

## A window measured on two machines

The 0.5 s window has to work for a client with latency. I measure it twice, in real time on each side.

On the owning client, `InputRollPressed` checks `CanReRoll()` before its usual tap / hold logic: the node is learned, a charge is left, there are pips, the result is re-rollable, and less than 0.5 s has passed since the result arrived on this machine. If all of that holds, R sends `ServerReRoll` instead of starting a new roll. Measuring from arrival means a client on a slow connection gets the same 0.5 s to react as the host.

The server checks again with its own clock: real time since it rolled, against the window plus `DiceReRollNetSlack` (0.3 s). It also checks charges, re-rollability and pips. A request that fails any check is rejected with a log line, and nothing changes.

I did not predict the re-roll on the client. The new result comes from the server's random stream, so there is nothing for the client to guess. It sends the request and waits for the new roll to replicate.

One side effect I kept: R pressed within about 0.5 s of a result that cannot be re-rolled does nothing, because the roll ability is still busy. After that, R starts a normal new roll.

## What the tests showed

All in the editor with a listen server and one client:

- **Advantage**: before learning the node, and on forced rolls and guaranteed 12s, no third die. After it, seven random rolls each logged three dice and kept the highest two, with the grade from those two. The client's copy had the same dropped die. It also applied to All-in.
- **Re-Roll, rank 1, host**: a forced 1 + 2 failure raised the bad-luck stack from 0 to 1, opened a Reversal and took the dice effects from 3 to 5. R at +0.27 s took the Reversal back, the stack returned to 0, one pip was spent, and a new 4 + 5 was rolled; the effects went back to 3 plus the new one. A second try in the same fight was rejected for no charge left. A new fight reset the counter.
- **Rank 2**: two re-rolls in one fight; the third R was a normal roll.
- **Not re-rollable**: a Guard 3 + 4 (heal) and a guaranteed 12 were marked not re-rollable, and R did not re-roll them. R at +0.95 s after any result was a normal roll.
- **Server check**: a cheat that sends the request 1.0 s after the result was rejected as outside the window, and a request with no charge was rejected.
- **Client**: R at +0.34 s after its own forced failure. The server logged the re-roll; the client's roll showed 4 + 5 marked as re-rolled, and the used counter was 1 on both machines.
- Tap roll, All-in and a successful Reversal still worked, with only the intended rejections in the log.

## Taking the idea to your own random abilities

If you want an "undo" for any random effect in GAS:

- Store the `FActiveGameplayEffectHandle` of every effect the result applied, and any other state it changed, on the server at the moment you apply them. Removing by handle is what makes the undo exact.
- Decide up front which results are reversible. Instant effects (heals, damage, one-off meters) are not, so either exclude those results or don't offer the undo.
- Measure the time window on each machine from when that machine saw the result, and give the server some slack for latency.
- Don't predict a request whose outcome is server randomness; just send it and let the new result replicate.
- Keep the charge counter on the server and replicate it to the owner, so the HUD and the server agree on what is left.

Still open: the HUD needs a real Re-Roll prompt with a countdown for the window, and a visual for the dropped die.
