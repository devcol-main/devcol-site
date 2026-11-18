---
title: "Fair Parry and Dodge Windows on a UE5 Listen Server: Press Timestamps, a 0.15 s Grace, and GAS Target Data"
description: "How I built guard, parry and dash for a UE5 action game with the Gameplay Ability System so that a client with latency gets the same parry and perfect-dodge windows as the host: the client sends its press time on the server clock as target data, the server clamps it to a short grace period and compares it with the hit time, and attack phases decide what dash and guard may cancel."
date: 2026-11-17
workedOn: 2026-10-20
publishAt: 2026-11-17
track: "Defense"
category: "Build Logs"
sidebar: "Server-Judged Parry and Dodge"
image: /blog/pseudo-parry-time-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Multiplayer, Networking, C++]
---

# Fair Parry and Dodge Windows on a UE5 Listen Server: Press Timestamps, a 0.15 s Grace, and GAS Target Data

This is how PSEUDO decides whether a guard, a parry or a dodge worked. The game has an 80 ms perfect-parry window and a 120 ms perfect-dodge window, and it runs as a listen server even in single player, so a remote client's button press reaches the server a little late. If the server judged the parry by asking "is the defender guarding right now?" when the hit lands, every client would lose its ping from every window. The answer I used: the client records **when** it pressed, on the server's clock, and sends that time with the ability activation. The server clamps the claim to the last 0.15 s and compares it with the time of the hit. The rest of this post is how that fits into the Gameplay Ability System, and what dash and guard are allowed to interrupt.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-parry-time-c.jpg" alt="The server compares the hit time with the press time the client reported, clamped to 0.15 s." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-parry-time-c-dark.jpg" alt="The server compares the hit time with the press time the client reported, clamped to 0.15 s." loading="lazy">
</figure>

The player-facing rules (window lengths, what a perfect parry earns, how Luck widens the windows) are on the wiki's [Defense](/wiki/pseudo/systems/defense) page. This post is about the machinery under them.

## Three kinds of enemy attack, one ordered check

Every enemy attack carries a defense type, `EPseudoAttackDefenseType`:

- **Parryable**: guard, parry and dodge all work.
- **Unblockable**: only a dodge helps; guard and parry do nothing.
- **DodgeOnly**: likewise, only a dodge helps.

The judgement itself lives in `UPseudoDefenseComponent`, a component on the player. It has two entry points that store a time, `BeginDash` and `BeginGuard`, and one function the enemy's hit code calls, `ResolveHit(AttackType)`. `ResolveHit` walks a fixed order and returns the first result that applies:

1. Inside the dash's invulnerability frames? If the hit is early in the dash, it is a **perfect dodge**, otherwise a plain evade.
2. Guard pressed recently enough for a **perfect parry**?
3. Guard pressed recently enough for a **parry**? (Parryable attacks only.)
4. Guard still held? Then the hit is **guarded** and does reduced damage. (Parryable attacks only.)
5. Otherwise the hit lands.

The enemy side, in its attack ability's trace callback, asks the target's defense component for this result, sends a matching `Event.Defense.*` gameplay event to the defender (that's where perfect rewards hook in), and applies damage only for "none" or "guarded". Guarded damage is multiplied by a `GuardDamageMultiplier`. In the test, a held guard took 2.4 from an 8-damage swing (8 × 0.3) and the full 8 right after release.

Because all of this is a comparison of times, the order of the checks is the only rule set. Adding a new defensive option means adding a step to that list.

## Sending the press time as target data

Both defensive abilities derive from one abstract base, `UPseudoGameplayAbility_Defense`, with the **LocalPredicted** execution policy. The button press starts the animation on the client immediately, and the server's copy of the ability runs from data the client sends.

On the owning client the base ability:

1. Builds a small struct, `FPseudoTargetData_Defense`: the direction of the dash and the press time, taken from `GetServerWorldTimeSeconds()` on the game state, so it is already on the server's clock.
2. Sends it to the server as gameplay ability target data inside a scoped prediction window. The struct has its own `NetSerialize`, so it travels like any other target data.
3. Runs the shared handler, `OnDefenseData`, locally right away.

On the server the same ability waits for that target data, copies it, consumes it, and then runs the same `OnDefenseData`. That handler is what calls `BeginDash` or `BeginGuard` with the reported time.

In the test the server received the press about 25 ms after the client made it and used the time the client reported, not its own arrival time.

## The grace clamp

A client can report any number. Without a limit, a modified client could claim it pressed guard two seconds ago and parry everything. So `BeginDash` and `BeginGuard` clamp the reported time to the range `[now − DefenseGraceTime, now]`, with the grace at 0.15 s.

That value is a judgement call. It covers ordinary latency, and inside it the server believes the defender. In other words the system favours the defender: if the client says it parried in time and the claim is less than 0.15 s old, the parry counts. For a multiplayer action game I'd rather have a rare parry that looked late on the host's screen than a client who feels robbed every time.

A press that arrives later than that is pulled forward to "0.15 s ago", which in practice means it is too late for the perfect windows.

## Guard: a tap still parries after you let go

Guard is `UPseudoGameplayAbility_Guard`. It owns the tag `State.Guarding`, plays the weapon's guard montage (a soft reference on the weapon data asset) and ends when the button is released, through the `WaitInputRelease` ability task. On release the server calls `EndGuard`.

Two details came out of the design:

- **No input buffer for guard.** Most of PSEUDO's abilities buffer an early press. Guard does not, because a buffered guard is a late guard, and a late parry should simply miss.
- **The parry window counts from the press, not from the hold.** Since the server stores the press time, a quick tap still parries a hit that lands after the button is already up. Holding only matters for the plain, damage-reducing guard.

The test showed both: a tap 0.041 s before the hit was a perfect parry, taps at 0.091, 0.107 and 0.164 s were parries, and a hit 0.209 s after a released tap did full damage.

Pressing guard with the weapon stowed draws the melee weapon at once on the server, with no draw animation, because a guard that waits for a draw comes too late.

`WaitInputRelease` needed a fix of its own first: in this engine version the ability system component no longer sent the replicated input events that task listens for, so the guard never ended. That story is in [A Guard That Never Let Go](./2026-10-20-pseudo-guard-input-release).

## Dash: direction from recent input, movement from root motion force

Dash is `UPseudoGameplayAbility_Dash`. It owns `State.Dashing`, has a cooldown effect that grants `Cooldown.Dash` with a SetByCaller duration, and picks one of four montage sections, Fwd, Bwd, Left or Right.

The direction comes from the move input, but only if that input is recent: the character records `RecentMoveInput` and the dash uses it if it is at most 0.15 s old. With no recent input the dash goes backwards in combat (a backstep away from the enemy in your face) and forwards out of combat.

The movement itself is `ApplyRootMotionConstantForce`, which the character movement component predicts, so the client and the server move the same distance without a correction.

At this stage the dash started on the press. Later I moved dash and sprint onto one button, where a short tap dashes on **release**; the server then takes the release time as the dash start and the windows are measured from there. The judgement code did not change, only which moment gets reported.

## What dash and guard may cancel

A fast defensive game needs dash and guard to cut into attacks, but a dash in the middle of a sword's hit frames would let you swing and vanish at the same time. I split each combo attack into phases with tags that the combo ability sets from the montage's notify windows:

- During the **hit window** the ability carries `State.Attack.Committed`. Dash is blocked by that tag, so a press there waits. The input buffer fires it right after the hit frames (0.11 s after the press in the test).
- During the **combo window** the ability carries `State.Attack.CanMoveCancel`. Both tags are cleared on every combo advance and when the combo ends.
- Everywhere else, dash and guard cancel the combo outright. The test cancelled at 0.03, 0.1, 0.5 and 0.9 s into attacks, on client and server.

Movement follows the same phases. `Input_Move` ignores the stick while an attack is playing, unless `CanMoveCancel` is set and the stick is past 0.3; then it cancels the combo and the player walks off.

One more connection: taking damage sends `Event.Combat.HitTaken` from the health attribute set, and the combo ability resets its perfect stack when it gets that event, so a perfect streak ends when you get hit.

## If you need the same in your project

The pieces that do not depend on this game:

1. **Judge timing windows with timestamps, not state.** Have the client read the server's clock (`GetServerWorldTimeSeconds()` on the game state) at the press, send that value, and compare it on the server with the time of the hit.
2. **Carry the timestamp as ability target data.** A custom `FGameplayAbilityTargetData` struct with `NetSerialize`, sent from a LocalPredicted ability in a scoped prediction window, keeps it tied to the activation that it belongs to.
3. **Clamp every client-supplied time.** Accept `[now − grace, now]` and nothing outside it. Pick the grace on purpose and write down which side it favours.
4. **Put the resolve order in one function.** One ordered list (dodge frames, perfect parry, parry, guard, damage) is easy to extend and easy to log.
5. **Don't buffer parries.** Buffer attacks and dashes, but a buffered parry arrives late by design.
6. **Use phase tags to decide what can cancel.** A "committed" tag during the hit frames and a "can move-cancel" tag during the recovery is enough for dash, guard and movement to make the same decision on every machine.

If a timing window seems shorter on a client than on the host, log the time the server receives the press next to the time the client reports. A steady gap the size of the ping means the server is judging by arrival time.

## Test numbers and what was left

I tested in PIE on a listen server with one client, with the client as the defender and the host far away:

- Dash: a hit 0.075 s after the press was a perfect dodge, 0.125 s an evade with no damage, 0.358 s a normal hit (past the 0.35 s invulnerability).
- Dash cooldown: a second press 0.45 s later was blocked, 0.75 s later it dashed.
- An Unblockable attack against a held guard (set in memory for the test): full damage.
- Guard while stowed: the greatsword was drawn and the guard pose played on both machines.
- A hit during a combo reset the perfect stack.
- An enemy far from the host still hit normally. That only worked after the fix in [Hits That Only Landed When the Host Was Watching](./2026-10-20-pseudo-offscreen-enemy-hits), because the server had stopped refreshing bones of meshes it wasn't rendering.

Left for later at this point: the perfect rewards were only events (dice charge, slow motion and the counter came with the dice and lock-on work, see [the time dilation post](./2026-11-16-pseudo-time-dilation-lock-on-hitstop)), the guard pose was a held frame of an attack clip and the dash used borrowed evade clips, and enemy attacks did not yet show whether they could be parried.
