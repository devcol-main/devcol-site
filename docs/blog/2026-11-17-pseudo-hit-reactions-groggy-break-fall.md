---
title: "Hit Reactions, a Groggy Gauge and Break-Fall in UE5 GAS: Reaction Tiers, a Server Hit React Ability, and an Ability Trigger That Fired on Child Tags"
description: "How I built stagger, knockback, down and launch reactions, a Sekiro-style groggy gauge, a timed break-fall and Stop / Sleep / Confuse statuses for players and enemies in Unreal Engine 5 with the Gameplay Ability System, including why an ability trigger tag must not have child event tags, CustomTimeDilation 0 as a freeze, and a Down pose that shook because its loop wasn't a still frame."
date: 2026-11-17
workedOn: 2026-10-21
publishAt: 2026-11-17
track: "Reactions and status"
category: "Build Logs"
sidebar: "Hit Reactions and Groggy"
image: /blog/pseudo-hit-react-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Animation, Multiplayer, C++]
---

# Hit Reactions, a Groggy Gauge and Break-Fall in UE5 GAS: Reaction Tiers, a Server Hit React Ability, and an Ability Trigger That Fired on Child Tags

This build log covers what happens to a character after a hit gets through: whether it flinches, staggers, flies back or falls down, how a gauge builds toward a long stun, how the player can break a fall by pressing Jump on landing, and how a few curse statuses (stop, sleep, confuse) behave. It applies to players and enemies alike. The short version for anyone doing the same in GAS: compare an attack's reaction tier against the target's resistance on the server, start one server-run hit react ability with a gameplay event, give that event a tag with no children, and keep the long stun on a separate gauge so ordinary hits and pressure are two different axes.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-hit-react-c.jpg" alt="A reaction plays only if the attack's tier beats the target's resist; else it's a flinch." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-hit-react-c-dark.jpg" alt="A reaction plays only if the attack's tier beats the target's resist; else it's a flinch." loading="lazy">
</figure>

The game-side rules (what a perfect parry adds to the gauge, how Luck interacts with defense) are on the wiki's [Defense](/wiki/pseudo/systems/defense) page. This post picks up at the last steps of the resolve chain described there: damage, gauge, reaction.

## Two separate axes: tier against resist, and a gauge

I took the model from Stellar Blade's balance gauge plus super armor, and Sekiro's posture:

- **The immediate reaction** is a comparison. Every attack has a `ReactionTier`, every character a `ReactionResist`. The tiers are ordered Flinch < Stagger < Knockback < Down < Launch. If the attack's tier is higher than the resist, the target plays that reaction. If not, it only flinches: an additive animation that does not interrupt what it is doing.
- **The groggy gauge** is separate. Attacks carry `PoiseDamage`, parries and perfect parries add to it, and so does one dice result. The gauge drains after a quiet period. When it fills, the target gets `State.Groggy`, a stun loop with increased damage taken, and the gauge resets afterwards. In the test a full gauge gave 4 s of groggy, the damage calculation logged `taken(1 + 0.50)`, and a partly filled gauge drained after 3 s without hits.

With two axes, a heavy enemy can ignore most hits (high resist) and still be broken by sustained pressure (the gauge). Both numbers come from data: the attack spec on each combo node and each enemy attack gets the tier and poise damage, and the enemy and pawn data assets get resist, max groggy, groggy duration, decay and a montage map.

In the test, the greatsword's first four combo hits staggered a dummy with +10 gauge each and the fifth knocked it back with +25. A dummy with Launch-level resist only flinched from everything.

I planned the gauge as a GAS attribute and built it as a replicated float on the reaction component instead. No gameplay effect modifies it and its decay rule is custom, so the attribute machinery didn't buy anything. It can become an attribute if a stat needs to scale it later.

## One component, one ability

`UPseudoReactionComponent` is on every character through the shared character base class. It owns the end of the hit flow on the server:

1. The health attribute set lands the damage and calls `HandleDamage`.
2. `HandleDamage` wakes a sleeping target, adds poise damage to the gauge, compares tier with resist, and applies the after-Down immunity (below).
3. `TriggerReaction` sends a gameplay event with the tier and hit direction in the payload.
4. The event starts the hit react ability, which owns `State.Reacting`.

The ability cancels whatever the character was doing: combo, guard, dice roll, weapon swap, enemy attack. It also blocks everything else, because the base ability class treats `State.Reacting` as a blocking tag for every ability in the game. That one tag is why a reacting enemy's attack is cut and why a player knocked down mid-combo can't keep comboing on the client.

The ability plays a replicated montage with four direction variants. Knockback adds a root motion force task. Launch goes up, falls, and ends in Down. There is no juggling in the air.

Players get a ServerInitiated version of the ability and enemies a ServerOnly subclass. The component grants the right one.

## The trigger that fired twice

The first version triggered the ability on `Event.Reaction`. Break-fall (next section) needed another event, `Event.Reaction.GroundContact`, sent at the moment a downed character touches the ground. Every time that event was sent, the hit react ability started again as a reaction of type "None".

GAS ability triggers on gameplay events match child tags as well. A trigger on `Event.Reaction` also fires for `Event.Reaction.GroundContact`. I moved the trigger to its own leaf tag, `Event.Reaction.Start`.

If you trigger abilities from gameplay events, give each trigger a tag that has no children, or check the exact tag inside the ability.

## Break-fall is judged like a parry

When a Down or Launch hits the player, pressing **Jump** at the moment of ground contact cancels the fall: the character plays a recovery motion instead of lying down, and gets the get-up invulnerability.

This is the same problem as a parry window over the network, and I solved it the same way as the [server-judged parry and dodge](./2026-11-17-pseudo-server-judged-parry-dodge): the client sends its press time on the server's clock as target data (`FPseudoTargetData_BreakFall`), and the server compares it with the contact time. Luck widens the window.

"Contact" has two sources. For Launch it is the character movement component's `Landed`. For Down there is no real landing, so a notify state on the Down montage, `ANS_PseudoGroundContact`, marks it. Moving that notify moves the break-fall moment.

From the test: Jump 0.017 s before contact gave an immediate break-fall on the client and the server log said "accepted (client lag -0.025 s)". Jump 0.73 s early missed, and the player got up normally with 1.5 s of immunity. A Launch with Jump at landing was accepted.

Against stun-locking, a player getting up is invulnerable, and for a short time after a Down or Launch any reaction is reduced to Flinch. In the test a minion hit on a lying player resolved as an evade, and a stagger right after getting up logged "immune ... flinch".

## Stop, Sleep and Confuse

These are dice curse results that until now were only tags.

- **Stop** sets the actor's `CustomTimeDilation` to 0. Animation, movement and the AI freeze for that one actor, damage still lands, and there is no reaction. The AI controller pauses its brain while a disabling tag is present and resumes after it (3 s in the test).
- **Sleep** blocks all actions and ends on any hit. The damage execution multiplies the waking hit by `SleepHitDamageMultiplier`: 4.6 became 6.9 in the test (×1.5), then the target staggered.
- **Confuse** makes the enemy attack the nearest other enemy. With nobody nearby it turns to a random direction, plays an attack and damages itself at the hit frame. A kill made while confused is credited to whoever applied the confusion: a helper looks up the instigator of the `Status.Confuse` effect. That matters because one dice Reversal asks for a kill.

For players, statuses go through a Luck roll on the server before they apply. With Luck 50, 8 of 12 poison procs were resisted in the test; with Luck 0, 5 of 5 applied.

## Death, and a Down that shook

Death plays a directional death montage, turns off capsule collision and the AI, and removes the corpse a few seconds later. I first added a console switch between montage-only and ragdoll to compare them. After seeing both, the result is: the death clip plays out, then the body ragdolls at its end, players included. Enemy corpses go 5 s after that. The ragdolled mesh ignores the camera and pawns, because the ragdoll collision profile resets those responses.

The Down reaction was a death clip plus a looping "Lie" section, and the lying player visibly shook. The loop covered the last 0.07 s of the clip, and in those frames the pelvis was still dropping 15 cm, so the loop replayed a small fall over and over. Lie now holds the very last frame for 0.8 s.

I also considered a ragdoll for Down and rejected it: there is no get-up clip that can blend from an arbitrary ragdoll pose, the body would drift away from the capsule differently on each machine, and the break-fall moment would no longer be a fixed notify.

## A testing trap with editor Python

A test cheat that triggered the server-initiated reaction ability from editor Python never activated it on the client. A call made from editor scripting runs with an editor callspace, so the client RPC ran locally instead of being sent. The cheat now defers the trigger to the next tick, which runs it in normal game code.

## What to check in your own reaction system

- One ordered path on the server: damage, then gauge, then tier against resist, then the event. Log each step.
- A trigger tag with no child tags for the reaction ability.
- One blocking state tag that every ability respects, so a reaction always wins over attacks, guards and other actions.
- Reactions on a separate axis from the long stun, both in data.
- Post-knockdown invulnerability and a short reaction immunity, or a fast enemy can keep a player on the floor.
- A looping "lying" section that holds one frame. Any motion in the last frames of a death clip shows up as shaking when looped.

## Leftovers

Most clips are placeholders: Down is a death clip plus the held frame, several enemies use the hit react clip for knockback, and the death direction mapping is a guess. Confuse's self-hit reuses an attack swing and has no status icon yet, and the gauge bar is a plain progress bar. An execution move on a groggy enemy, a wake-up roll, and fall damage that reuses the break-fall judgement come later. A separate bug with the player's groggy gauge is written up in [A Groggy Gauge That Never Filled](./2026-10-23-pseudo-player-groggy-never-triggers).
