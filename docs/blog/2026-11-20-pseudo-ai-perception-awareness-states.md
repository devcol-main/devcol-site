---
title: "UE5 AI Perception With Awareness States: Sight, Hearing, Damage and Seeing an Ally Get Hit, Mapped Into a State Tree by Tags"
description: "How I added AIPerception to a State Tree enemy in Unreal Engine 5: senses built from each enemy's data asset at possess, an AI controller that decides Idle, Suspicious, Combat, Lost and Return, replicated gameplay tags that the tree only maps to states, footstep and gunshot noises through ReportNoiseEvent, a custom 'saw an ally get hit' rule, and a calm walk speed that cancelled slow effects."
date: 2026-11-20
workedOn: 2026-10-22
publishAt: 2026-11-20
track: "AI perception"
category: "Build Logs"
sidebar: "AI Perception and Awareness"
image: /blog/pseudo-perception-c.jpg
outline: deep
tags: [UE5, AI, AI Perception, State Tree, Multiplayer]
---

# UE5 AI Perception With Awareness States: Sight, Hearing, Damage and Seeing an Ally Get Hit, Mapped Into a State Tree by Tags

This is how PSEUDO's enemies stopped knowing where the player is at all times. The useful pattern for your own AI: let the AI controller turn perception events into one awareness state (Idle, Suspicious, Combat, Lost, Return), publish that state as gameplay tags, and let the State Tree do nothing but map tags to states. Perception settings come from each enemy's data asset, so a boss can keep a simple radius rule while grunts see, hear and react to hits.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-perception-c.jpg" alt="The controller turns sight, noise and hits into one state the State Tree follows." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-perception-c-dark.jpg" alt="The controller turns sight, noise and hits into one state the State Tree follows." loading="lazy">
</figure>

## What the first AI did, and what this added

The first enemy AI ([A UE5 State Tree Enemy AI With One GAS Attack Ability](./2026-11-15-pseudo-enemy-ai-statetree-core)) picked a target with a radius rule: the nearest living player within an engage radius, dropped beyond a lose radius. The base State Tree was already laid out for Idle, Suspicious, Combat, Lost and Return, but only Idle and Combat did anything. The design behind those states is on the [enemy AI wiki page](/wiki/pseudo/systems/enemy-ai).

This build added:

- sight with a radius, a lose radius, a half angle and a memory time;
- hearing for footsteps (louder with speed) and gunshots;
- a damage sense, so an enemy knows where the attacker stood;
- a custom rule: an enemy that sees an ally get hit becomes suspicious;
- a choice of senses per enemy, and the Suspicious, Lost and Return states in the base tree.

Attack tokens and strafing, EQS for search and firing spots, teams, ally calls, corpses and alert icons were left for later. The awareness tags already replicate so icons can use them.

## Senses come from the enemy's data

Each enemy has a data asset, and this build gave it a `Senses` struct: sight radius, lose radius, angle, memory, hearing range, whether hits and ally hits count, search times and a calm speed scale. One flag, `bUsePerception`, decides which model an enemy uses. Off means the old radius rule, and bosses keep it. Confused enemies also fall back to the radius rule, because they target other enemies.

The `UAIPerceptionComponent` sits on the AI controller. AI controllers only exist on the server, so perception is server-only by construction. At possess, `ConfigureSenses` builds the sight and hearing configs from the data. PSEUDO has no teams set up yet, so every affiliation is detected and the controller filters the results itself: players are targets, enemies are allies. Epic's [AI Perception page](https://dev.epicgames.com/documentation/unreal-engine/ai-perception-in-unreal-engine) describes the sight, hearing and damage senses and their settings.

## The controller decides, the tree only maps

I kept the rules in C++ on the controller and out of the State Tree. `UpdateAwareness` runs every controller tick and at each Find Target step:

- **Sees a living player** → Combat, with that player as the target. While the current target is still in sight, it stays the target.
- **Combat, and out of sight for longer than the sight memory** → Lost. The enemy walks to the last known spot, then to random reachable points within a search radius.
- **Lost for longer than the search time** → Return: walk back to the spawn spot, then Idle.
- **Heard a player's noise, was hit by a player, or saw an ally get hit** → Suspicious. It walks to the noise or attacker spot and faces it. If nothing turns up within a set time after arriving, it returns home. Sight at any point confirms Combat.

While calm (Idle, Suspicious, Lost, Return) the enemy walks at a fraction of its speed.

The state is published as replicated loose gameplay tags, `AI.Awareness.Suspicious`, `.Combat`, `.Lost` and `.Return`, with no tag meaning Idle. The base tree got Suspicious, Lost and Return states that run one shared task, `Pseudo Move To Interest`, and each state is reached by an OnTick transition that checks for its tag. The Idle to Combat change is still the existing Find Target success, and Combat still fails back to Idle when the target is gone.

I preferred this split for two reasons. The rules are code I can step through and test, and the same tags are what a client needs to show an alert icon, since no AI code runs on clients. The tree stays a readable picture of the states.

## Noises from the player

Noises are reported on the server with `UAISense_Hearing::ReportNoiseEvent`:

- **Footsteps**: a server timer on the player character reports one every 0.3 s while it moves on the ground. Loudness is `FootstepNoiseLoudness` (0.35) times the ratio of current to max speed, so running is louder than walking.
- **Gunshots**: the server's shot handler reports one at `GunshotNoiseLoudness` (1.5).

An enemy hears a noise when the distance is below its hearing range times the loudness. These numbers are in project settings, and a cheat command, `PseudoNoise <loudness>`, makes a noise on demand for testing.

## Being hit, and seeing an ally get hit

Damage arrives as a gameplay event on the enemy. The controller treats it as a damage sense and becomes suspicious toward the attacker's position. Then it asks every enemy within `AllyHitNotifyRadius` (2500 cm) whether it can currently see the victim. Any that can become suspicious too. This is not an engine sense; it is a direct check against each nearby enemy's sight.

One bug came up in testing. The hit's instigator was the player state, not the pawn, so the attacker position was wrong until the controller resolved the state to its pawn.

## A calm walk that cancelled slow effects

After merging I found one more problem while preparing the review. The calm walk set `MaxWalkSpeed` directly from the data, which overwrote any dice or status slow on that enemy. Slowing a suspicious enemy did nothing.

The fix moved the scaling into one function on the base character, `SetMoveSpeedScale`, that multiplies on top of the `MoveSpeedMultiplier` attribute instead of replacing the speed. Measured on an enemy with a base of 380 cm/s:

| State | No slow | Slow ×0.6 |
|---|---|---|
| Idle | 380 | 228 |
| Suspicious / Return | 190 | 114 |
| Combat | 380 | 228 |

With the slow removed it went back to 380. If you have more than one system writing a movement speed, give them one place that combines them; a plain assignment from any of them wins over the others.

## What the tests showed

Listen server plus one client, with a melee minion that has perception on:

- **Sight**: the host standing 600 cm behind the minion stayed unseen for 21 s. In front, the log read `target ... (seen, 600 cm)`, it switched to Combat and attacked. The client's player in front was targeted and hit the same way.
- **Lost and Return**: 3.0 s after sight ended it went to Lost, walked at the calm 190 cm/s to the last known spot, moved between search points, returned after the search time, and was Idle at home.
- **Hearing**: a 1.5 noise 800 cm behind was heard (it turned, saw the player and went to Combat); a 0.2 noise at 1500 cm was not. Running 400 cm behind was heard as footsteps, and a pistol shot at 1500 cm was heard as a gunshot.
- **Damage sense**: hit from behind, it became suspicious toward the attacker and 0.4 to 0.5 s later was in Combat. A real Light attack did the same.
- **Ally hit**: minion B, 1450 cm from minion A, could see A but not the host at 1600 cm. When A was hit, B became suspicious. With B turned away, nothing happened.
- **Per enemy**: the boss still used the radius rule (`target ... (978 cm)`, no awareness lines). A minion with hearing switched off ignored a 1.5 noise.
- The combo still worked on the minion, the client saw it move with the server, and there were no game errors in the log.

## Rough edges

- `LogAIPerception` warns once per sense at possess that the listener needs a valid id to update its sense config. Sight and hearing work, because the configs are kept and applied when the listener registers, but configuring at the right moment should silence it.
- While the sight memory runs, the last known spot follows the target's real position, so the enemy effectively knows where you went for those seconds. A teleport in a test sends the search to the teleport spot.
- Perception is stale for a moment right after a teleport.
- A minion once stood still for about 20 s after flickering between Combat and Lost. That is on the watch list.
