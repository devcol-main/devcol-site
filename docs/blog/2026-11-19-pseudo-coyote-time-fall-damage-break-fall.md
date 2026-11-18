---
title: "Coyote Time, Fall Damage and a Break-Fall Landing in UE5 Multiplayer: CanJumpWhileFalling, Landed Velocity and a Client That Lands First"
description: "How I built jump and landing rules for a UE5 listen-server game: coyote time through ACharacter::CanJumpWhileFalling counted per movement step so client and server agree, fall height from the vertical speed in Landed, server-judged fall damage with a Luck roll, a predicted break-fall claim checked against the server's contact time, and double jump and air dash unlocked from a skill tree."
date: 2026-11-19
workedOn: 2026-10-22
publishAt: 2026-11-19
track: "Jump and Landing"
category: "Build Logs"
sidebar: "Coyote Time and Landing"
image: /blog/pseudo-landing-c.jpg
outline: deep
tags: [UE5, GAS, Multiplayer, Movement, C++]
---

# Coyote Time, Fall Damage and a Break-Fall Landing in UE5 Multiplayer: CanJumpWhileFalling, Landed Velocity and a Client That Lands First

These are PSEUDO's jump and landing rules and how they were built: coyote time, fall damage, a landing recovery, a break-fall roll that cancels both, and two unlockable moves (double jump, air dash). If you want coyote time in a networked game, the short answer is to override `ACharacter::CanJumpWhileFalling` and count the falling time inside the movement step, not on a timer. The Character Movement Component runs that step on the client and again on the server with the same delta time, so both machines agree on whether the jump was still allowed.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-landing-c.jpg" alt="Coyote time is counted per movement step, and the client's landing runs ahead of the server's, so the break-fall check is reversed." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-landing-c-dark.jpg" alt="Coyote time is counted per movement step, and the client's landing runs ahead of the server's, so the break-fall check is reversed." loading="lazy">
</figure>

The measured numbers (jump heights, gap distances, and why only about 0.11 s of the 0.15 s coyote window is usable at a ledge) are on the wiki's [level metrics](/wiki/pseudo/systems/level-metrics) page. The break-fall after a knockdown is in [hit reactions and break-fall](./2026-11-17-pseudo-hit-reactions-groggy-break-fall). What follows is the landing side.

## The rules I set

- Coyote time is 0.15 s, and jump presses go through the same input buffer as everything else.
- No fall damage up to 500 cm. Above that, damage rises linearly to 40 % of max health at 1500 cm and stays capped there. From 1000 cm, a landing also plays a recovery animation that stops you for a moment.
- **Break-fall** is Jump pressed at ground contact. It's the same input and the same timing judge as the break-fall out of a knockdown.
- The order is **break-fall, then Luck, then damage and recovery**. A successful Luck roll means no damage and no recovery. This is the same resolve-chain shape the [defense page](/wiki/pseudo/systems/defense) uses for incoming hits.
- Double jump and air dash are skill tree unlocks, usable once each per air time, and they reset on landing. The air dash is horizontal with gravity off and has the same invulnerability frames as the ground dash.

## Coyote time inside the movement step

UE 5.8 has a hook made for this: `ACharacter::CanJumpWhileFalling`. Returning true lets the first jump happen while the character is already falling. The hard part is "still inside 0.15 s". Ask a timer and the client and server can disagree, because they don't fall at the same wall-clock moment.

So the player character counts falling time per movement step in `CheckJumpInput`. The movement component calls that function for every move on the client and again on the server when it replays the move, with the same delta time. Both machines add up the same numbers and reach the same answer. Epic's page on [networked movement in the Character Movement Component](https://dev.epicgames.com/documentation/unreal-engine/understanding-networked-movement-in-the-character-movement-component-for-unreal-engine?lang=en-US) explains that replay, and it's the reason this works.

Coyote time only applies after walking off a ledge (`JumpCurrentCount == 0`). A jump from the ground has already been counted. In testing, a jump 0.08 s after walking off a block fired on both host and client, and one at 0.35 s did not. There were no movement corrections apart from the ones caused by the cheat teleports.

One gap is left. The counter isn't part of the saved move, so if the client replays moves after a correction, it counts the falling time again. That errs on the strict side: it can refuse a late jump, but it never allows a false one.

## Fall height from the landing speed

I don't track the highest point. The fall height is v² / 2g, using the vertical speed at `Landed`. The movement component calls `Landed` before it clears the velocity, so the speed is still there. This gives the drop from the last apex, so a double jump or an air dash starts the count over. In testing, a landing after a double jump measured 247 cm, which matched the second apex (242 cm), not the first.

Each machine computes the height for its own use, and the server's value decides damage.

## A break-fall claim when the client lands first

A landing component on the player handles the judgment on both sides.

**On the owning client** it records the Jump press for this fall: either a press in the air that can't jump (no double jump left) or a press inside the window after a dangerous contact. The jump ability doesn't get that press. The component also records its own contact time on the server clock. If the press and the contact fall inside the window (widened by Luck), it activates a locally predicted break-fall ability, and the claim travels to the server as GAS target data.

**On the server**, its own `Landed` with a dangerous height first rolls Luck. If that fails, the server starts the landing recovery (for 1000 cm and above), waits until the window has passed for a claim, and only then applies the fall damage. A valid claim cancels both: no damage, the recovery is cancelled, and the roll plays.

The claim check compares the client's contact time with the server's. Here the sign is the reverse of the knockdown break-fall. For a knockdown, the server starts the reaction first and the client sees it later. For a fall, the client's own movement runs ahead of the server, so the client touches the ground first, by about half the round trip. In testing, the client's contact came 0.024 s before the server's and was accepted. A copied check would have rejected honest clients. If you reuse a timing check in a new situation, work out which machine's event happens first before reusing the tolerance.

Other test results:

- A host press 0.021 s after contact was accepted, with no damage.
- Presses 0.033 and 0.017 s before contact were held until the server landed, then accepted.
- A press 0.4 s late gave damage and recovery. The recovery's reacting state swallowed the press.
- Forged claims were rejected with `press outside the window` and `contact time does not match the server`.

One thing looks odd on the host. A press just after contact briefly starts the recovery, which the accepted break-fall then cancels. The server can't wait for a press that may never come, so it starts the recovery and lets the claim undo it.

## Damage that skips the damage formula

Fall damage is an instant gameplay effect that adds to the incoming-damage meta attribute through a SetByCaller value and carries a `Damage.Type.Fall` asset tag. It skips the damage calculation, so defense, resistances and crits don't apply. A barrier still absorbs it, and death works as usual. A landing during a reaction, such as being launched or knocked off a ledge, is left to the reaction's own judgment and doesn't count as a fall here.

Measured with 150 max health: 415 cm did nothing, 1012 cm did 20 % (30.7) plus the recovery, and 1507 cm and 2004 cm both did the capped 40 % (60). A client landing at 1009 cm left 119.45 health on both server and client. With Luck forced to 100 % the log said `saved by Luck` and nothing else happened. At 0 % the same fall did 42.5 damage plus the recovery.

## Two unlocks from the skill tree

- **Double jump**: `JumpMaxCount` is 2 while the owner has the double jump unlock tag (a replicated loose tag granted by the skill tree), and 1 otherwise. An air jump plays its own montage.
- **Air dash**: the dash ability checks `IsFalling`. In the air it needs the air dash unlock and an unused air dash. The "used" flag is set on both machines when the dash starts and cleared in `Landed`. The root motion runs with gravity off, and the invulnerability frames come from the same server path as the ground dash. In testing, the height stayed constant for the 0.35 s dash, and a second air dash in the same jump did nothing.

## If you are adding this to your own character

- Override `CanJumpWhileFalling` for coyote time and count falling time in something the movement component calls per move. Avoid timers and world time.
- Take fall height from the vertical speed in `Landed`. It resets naturally on any upward impulse.
- Make the server wait out the claim window before it applies landing damage, and let an accepted claim cancel whatever the server already started.
- When you judge timing across machines, decide which side experiences the event first. The tolerance points the other way when the client's own movement causes the event.

## Still rough

The double jump reuses a jump start clip, the air dash plays the ground roll, and the landing recovery clip is a placeholder. Fall damage counts as combat, so a hard landing keeps the in-combat state alive for a moment. Enemies can't double jump or air dash, and wall jumps aren't planned.
