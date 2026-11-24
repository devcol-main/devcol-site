---
title: "Light and Heavy Attacks From One GAS Combo Ability: Granting It Twice With Different Input Tags and Blocking With BlockAbilitiesWithTag in UE5"
description: "How I split a UE5 greatsword combo into a light chain on LMB and a heavy chain on RMB without a second ability: the same melee combo ability granted as two specs, each with its own input tag in the dynamic spec source tags, a duplicate check on class and input tag, BlockAbilitiesWithTag so only one combo runs, renamed montage sections, and what happens to a cross press."
date: 2026-11-26
workedOn: 2026-11-01
publishAt: 2026-11-26
track: "Melee combo"
category: "Build Logs"
sidebar: "Light and Heavy Combos"
image: /blog/pseudo-light-heavy-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Enhanced Input, Animation, Multiplayer]
---

# Light and Heavy Attacks From One GAS Combo Ability: Granting It Twice With Different Input Tags and Blocking With BlockAbilitiesWithTag in UE5

PSEUDO's greatsword started as one five-hit chain on the left mouse button. Testing showed the first two swings barely reached anything, which is wrong for a light attack, so I split the combo: the first two swings became a heavy chain on the right mouse button, and the last three became a three-hit light chain ending in the finisher. The part worth knowing if you use the Gameplay Ability System is how little code that took. The combo ability is granted twice, once per input tag, and each spec reads its own input tag to pick where the combo starts. One line of `BlockAbilitiesWithTag` keeps the two specs from running at the same time. Server and client agree on the entry without any extra data.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-light-heavy-c.jpg" alt="The same combo ability is granted twice, and each spec's input tag picks the light or heavy chain." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-light-heavy-c-dark.jpg" alt="The same combo ability is granted twice, and each spec's input tag picks the light or heavy chain." loading="lazy">
</figure>

How the combo works in general (a data-asset graph walked by one runner ability, notifies that only send events, perfect inputs, a predicted advance) is in [Building a UE5 Melee Combo With One Gameplay Ability](./2026-11-14-pseudo-melee-combo-graph-build). The player-facing rules are on the wiki's [Combos and Cancels](/wiki/pseudo/systems/combo-and-cancels) page.

## Moving the swings without touching the timing

All seven greatsword clips live in one montage, one section per step. The split kept every clip at the same time on the timeline and only renamed sections and rewired their links:

| Clip | Old section | New section |
|---|---|---|
| Swing A | `Light_1` | `Heavy_1` |
| Swing B | `Light_2` | `Heavy_2` |
| Swing C | `Light_3` | `Light_1` |
| Swing D | `Light_4` | `Light_2` |
| Finisher | `Light_5` | `Light_3` |

The combo window, perfect window, hit window and area-attack notifies are placed by time on the montage's notify track, so they stayed on their clips with no edits. Each recovery section was renamed with its swing, and its "next section" link updated.

In the combo graph asset, each node kept its attack data (damage, perfect bonus step, reaction tier, poise, hitstop, area radius). The heavy nodes now carry an `Attack.Type.Heavy` tag instead of `Attack.Type.Light`, so other systems can ask what kind of hit landed. An upgrade that turned the finisher into a fire attack pointed at `Light_5`; it now points at `Light_3`.

## Option one: a second input on the same spec

The combo runner was already input-agnostic. The ability system component forwards every pressed input tag to the active combo, the combo looks for a transition on that tag in its current node, and the input buffer stores tags, not keys. What decided the start of a combo was the spec's own input tag:

```cpp
const FGameplayTag StartInput = Spec->GetDynamicSpecSourceTags().First();
CurrentNode = Graph->FindNextNode(NAME_None, StartInput, ASC->GetOwnedGameplayTags());
```

The obvious alternative was one spec with both input tags and an event payload saying which button was pressed. That needs a new activation path and a way to get the pressed tag to the server in step with the activation. I went the other way.

## Option two, the one I kept: grant the ability twice

The pawn's startup abilities now list the combo ability twice: once with `InputTag.Attack.Light`, once with `InputTag.Attack.Heavy`. Two things had to change for that to work.

**The duplicate check.** `GrantAbility` skipped any ability class that was already granted, so the second grant was silently dropped. It now treats an ability as a duplicate only when both the class and the input tag match:

```cpp
if (ExistingSpec.Ability && ExistingSpec.Ability->GetClass() == Grant.Ability && ExistingSpec.GetDynamicSpecSourceTags().HasTagExact(Grant.InputTag))
{
	return;
}
```

**Only one combo at a time.** With two specs, a heavy press during a light combo would activate the heavy spec and run two combos at once. The combo ability's constructor now blocks its own tag:

```cpp
BlockAbilitiesWithTag.AddTag(PseudoGameplayTags::Ability_Melee_Combo);
```

While one combo spec is active, the other cannot activate. That is ordinary GAS blocking, and the blocked press falls into the ability system component's activation buffer.

Because each spec carries its input tag from the moment it is granted, and the server grants the same list, both machines read the same entry node from the spec itself. Nothing about the press needs to travel with the activation.

## Following one right-click through the system

1. The heavy input action fires and the controller passes `InputTag.Attack.Heavy` to the ability system component.
2. If a combo is active, it gets the tag first and takes it only if its current node has a heavy transition. Otherwise the press falls through.
3. The heavy spec tries to activate. If a combo is still running, the block stops it and the press waits in the activation buffer.
4. On activation, the spec's input tag picks `Heavy_1`, or the draw attack when the sword is on the back.

The draw attack is the one entry both chains share. It plays swing A, the same clip as `Heavy_1`, so it works as step 1 of either chain: a light press from stowed goes on to `Light_2` as before, and a heavy press from stowed (new) goes on to `Heavy_2`.

## Cross presses are dropped on purpose

There are no light-to-heavy or heavy-to-light transitions in the graph yet. A heavy press during a light combo is not a combo input; it waits in the 0.15 s activation buffer and starts the heavy chain only if the light combo ends inside that time. Otherwise it is dropped. Mixed strings such as `Light_1` into `Heavy_2` are one transition row in the graph asset when I want them, with no code.

With the pistols drawn, the right mouse button still does nothing, as before: the heavy spec fails its activation check because there is no melee graph for the pistols.

The new input action got the remappable name `AttackHeavy`, matching the unprefixed names the [key remapping screen](./2026-11-22-pseudo-settings-menu-key-remapping-commonui) already uses, and a gamepad key (triangle / Y). The light attack still has no gamepad key; that is left for when pad play gets tested.

## Checking it on a listen server

I drove the presses through the input actions themselves, timed against the end of each swing (just after for a perfect input, 0.9 s after for a late one), on the combat test map with enemies frozen. A new log line on activation, `start <node> (input <tag>)`, made the entry visible on both machines.

- Client light chain: `start Light_1 (input InputTag.Attack.Light)`, then `Light_1 -> Light_2 (perfect=1, stack=0.10)`, `Light_2 -> Light_3 (perfect=1, stack=0.20)`, and the finisher's area attack with radius 300.
- Client heavy chain: `start Heavy_1 (input InputTag.Attack.Heavy)`, `Heavy_1 -> Heavy_2 (perfect=1, stack=0.10)`.
- A late press advanced with `perfect=0, stack=0.00`, and a new combo started at 0.
- Every client start and advance had a matching server line one frame later, the host's chains hit on every node, and a search for rejections over the whole session found none.
- A heavy press inside `Light_1`'s window: no transition and no second combo.
- A heavy press with the sword stowed: `start Draw_1 (input InputTag.Attack.Heavy)`, the sword was drawn, then `Draw_1 -> Heavy_2`.

The heavy and light nodes still share the same numbers (damage multiplier 1.0, stagger, poise 10). Making the heavies feel heavier is a tuning pass on the graph asset.

## Doing the same in your project

- **Let the spec carry the input.** Put the input tag in the spec's dynamic source tags at grant time and read it in `ActivateAbility`. Then the server knows which button started the ability without being told.
- **Grant one ability per input** when the logic is the same and only the entry differs, and make sure your grant helper's duplicate check includes the input tag.
- **Block the ability's own tag** with `BlockAbilitiesWithTag` so two specs of it never overlap.
- **Rename montage sections instead of moving clips** when you regroup a combo. Notifies placed by time come along for free.
- **Decide cross presses deliberately.** Without transitions between chains, a buffered press either starts the other chain right after or is dropped. Adding a mixed string should be a data row.
