---
title: "Elemental Damage, Resistances and Status Buildup in UE5 GAS: Data Assets, One Execution, and a Poison DoT That Counted Stacks Twice"
description: "How I added ten damage elements, per-enemy resistances, Elden Ring style status buildup and element shields to an Unreal Engine 5 Gameplay Ability System damage execution, so a new element needs no code change, plus two GAS traps: periodic damage multiplied by stack count twice, and gameplay effect components in a native constructor."
date: 2026-11-16
workedOn: 2026-10-19
publishAt: 2026-11-16
track: "Elements and resistances"
category: "Build Logs"
sidebar: "Elements and Resistances"
image: /blog/pseudo-elements-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Data, Multiplayer, C++]
---

# Elemental Damage, Resistances and Status Buildup in UE5 GAS: Data Assets, One Execution, and a Poison DoT That Counted Stacks Twice

This build log covers how elemental damage went into PSEUDO's Gameplay Ability System setup: ten elements, a resistance per element on every enemy, statuses that build up instead of applying on contact, and element shields. If you're adding elements to a GAS damage execution: describe each element in a data asset that names its attributes, have the damage execution loop over the resistance set instead of naming each attribute, and if you write your own damage-over-time formula with stacks in it, call `MarkStackCountHandledManually`, or GAS multiplies by the stack count a second time.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-elements-c.jpg" alt="Each element is a data asset, and the damage execution loops over every resistance attribute." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-elements-c-dark.jpg" alt="Each element is a data asset, and the damage execution loops over every resistance attribute." loading="lazy">
</figure>

The rules a player sees (what each element does, the resistance cap, the buildup threshold, shields and weakness) are on the wiki's [Elements and Reactions](/wiki/pseudo/systems/elements) page. Here I'll stick to how they were wired into the engine.

## How a hit carries its element

An attack's element comes from two places. The weapon's data asset has a default `DamageElement` and `ElementGauge` (the greatsword is Physical with a gauge of 0). A node in the combo graph, the data asset that describes the melee combo, can override both for one attack.

When the combo ability builds its damage spec, it puts the element on the spec as a dynamic asset tag (`Damage.Element.Fire` and so on), and the gauge as a SetByCaller value. If the player entered the current combo step with a perfectly timed input, the gauge is doubled. Anything that reads the spec later gets the element from a tag, so nothing downstream needs to know about weapons or combos.

## One data asset per element, so the execution never changes

Each element is a `UPseudoElementDefinition` data asset. It holds the tag, the display name and color, and three references into the attribute sets:

- `ResistanceAttribute`: which attribute on the target resists this element.
- `BuildupAttribute`: which attribute fills up toward the element's status.
- `ShieldWeaknessTag`: which shield this element counts as the weakness for.

It also holds the status effect class with its threshold, duration and damage. The ten assets are registered in a list in Project Settings, and a small subsystem answers "which element has this tag" and "which element owns this buildup attribute".

The resistances themselves live in `UPseudoResistanceSet`: ten replicated attributes, deliberately not clamped in the set, because the cap is applied in the damage math (0.75 at most, −1 at least, with 1 or more meaning immune). Per-enemy values come from a data table whose CSV columns are named after the elements; the loader maps a column `Fire` to the attribute `FireResist` by reflection, so a new element adds a column, not code.

In the damage execution I don't declare one capture per resistance. It captures every attribute in the resistance set by iterating over the set's properties, then picks the one the hit's element asks for. The resistance term is applied after crits. The result is the part I wanted: adding an element means a new data asset, a new attribute and a new table column, and the damage calculation itself stays untouched.

## Status buildup as an attribute that crosses a threshold

I chose buildup over stacks per hit: elemental hits fill a gauge, and the status fires when the gauge passes a threshold. In GAS terms the execution writes the buildup into an attribute in `UPseudoStatusSet` (for now only `PoisonBuildup`; each later status adds one). The set's `PostGameplayEffectExecute` watches it, and when it reaches the threshold it resets the attribute to 0 and applies the status effect.

One detail matters here: the status is applied **with the context of the hit that triggered it**. That keeps the attacker as the instigator of the poison, so kill credit and anything else that asks "who did this" still points at the right character.

Buildup also decays over time. That's a native infinite periodic effect, `UPseudoGameplayEffect_StatusDecay`, applied when a character spawns or is possessed.

## The poison that did five times the damage

Poison is a native gameplay effect too: a 1 second period, stacking aggregated by target up to 5, a new application refreshes the duration, expiry removes one stack instead of all of them, and it grants the tag `Status.Poison`. Its tick damage goes through the same damage execution, marked as damage over time, with the formula `base × stacks × (1 − resist)`.

The first test with five stacks dealt 50 per tick instead of 10. GAS already multiplies a periodic execution's output by the effect's stack count, and my formula multiplied by stacks as well. The fix is one call in the execution: `MarkStackCountHandledManually`, which tells GAS that the calculation has already accounted for stacks. If your DoT formula has a stack term in it, you need this call. If it doesn't, leave it out and let GAS do the multiplying.

Poison is removed on death.

## Gameplay effect components in a native constructor

Writing gameplay effects in C++ instead of as Blueprint assets brought up a second trap. Poison grants its tag through a gameplay effect component, and in a native effect's constructor I first used `FindOrAddComponent`, which creates the component with `NewObject`. That ended in a fatal error at module load. In a constructor the components have to be created as default subobjects: `CreateDefaultSubobject`, then add the result to `GEComponents` yourself.

## Shields as a meta attribute

Some enemies carry an element shield with a weakness. I kept the split in the damage execution. It works out how much of the hit the shield takes (×2 for the weakness element, ×0.25 for anything else) and writes that to a meta attribute, `IncomingShieldDamage`. The health set turns that into a loss of `ElementShield`, and whatever breaks through goes to health at full strength. When the shield reaches zero, the enemy gets `State.ShieldBroken`. A shield is just two more attributes (`ElementShield` and `MaxElementShield`) and two columns in the enemy stat table (`ElementShield`, `ShieldWeakness`).

## Numbers from the test

I tested it in PIE as a listen server plus one client, attacking as the client player, against a dummy and a shielded dummy (30 shield points, weak to Fire):

| Case | Result |
|---|---|
| Fire / Ice / Physical hit | 15.13 / 5.04 / 10.08 |
| Lightning at the resistance cap | 2.52 |
| Dark against an immune target | 0 |
| Shield hit, weakness / not weakness | ×2 / ×0.25 |
| Hit that breaks the shield | 6.43 overflow to health, `State.ShieldBroken` set |
| Poison gauge per hit, normal / perfect input | 40 / 80, status at 100, gauge reset |
| Poison ticks | 2 × stacks, capped at 5 stacks, one stack lost on expiry |

Resistances, shields, buildup values and status tags were identical on the client, and the server rejected no hits.

## If you're adding elements to your own GAS project

- Keep the element on the spec as a tag and the amount as SetByCaller, so the execution reads one source no matter where the attack came from.
- Let a data asset map element → resistance attribute → buildup attribute, and capture attributes by iterating the set. The execution should not have a line per element.
- Clamp resistances in the formula, not in the attribute set, if you want values above the cap to mean immunity.
- Apply a triggered status with the triggering hit's effect context, so the instigator stays correct.
- With stacks in your DoT formula, call `MarkStackCountHandledManually`. A test with more than one stack shows it at once.
- In native gameplay effect constructors, create components with `CreateDefaultSubobject` and add them to `GEComponents`.

Burn came later and brought its own problems (a Niagara effect with no flames, and an editor crash on re-activation): [A Niagara Burn Effect With No Flames](./2026-11-05-pseudo-burn-status-recursion-crash). Status visuals on clients have their own post: [A Status Look the Client Never Showed](./2026-11-07-pseudo-status-look-missing-on-client).

## What this version doesn't do yet

Only Poison exists as a status. The other statuses, the reactions between two elements and the elemental mastery stat are later work, and none of the combo attacks has an element override yet; I only set one temporarily to test.
