---
title: "A Dead Player Gets Up After Pressing Attack in UE5 GAS: State.Dead Missing From ActivationBlockedTags, and Two Other Ways a Death Montage Breaks"
description: "In a UE5 GAS action game, a player who kept pressing attack while dying stood back up: the melee combo did not block State.Dead, so its montage replaced the held death clip through Montage_Play's group stop. Also: a death while knocked down replayed the clip from standing, and a death in the air froze the corpse mid-air. Fixed with one tag in the base ability, a lying start frame, a land-then-settle corpse and an OnMontageStarted guard."
date: 2026-11-23
workedOn: 2026-11-22
publishAt: 2026-11-23
track: "Dead player stands up"
category: "Debugging / Input & GAS"
sidebar: "Abilities on a Dead Body"
image: /blog/pseudo-dead-block-c.jpg
outline: deep
tags: [UE5, GAS, Animation, Montage, Multiplayer, Debugging]
---

# A Dead Player Gets Up After Pressing Attack in UE5 GAS: State.Dead Missing From ActivationBlockedTags, and Two Other Ways a Death Montage Breaks

A death montage that holds its last frame stays down only as long as nothing else plays a montage on that mesh. In PSEUDO (UE 5.8.3) the player's melee combo did not have the "dead" tag in its `ActivationBlockedTags`, so pressing attack while dying started the combo, its montage pushed the death clip out, and the body ended up standing in idle. The fix that covers every ability at once is one line in the base ability class. The same test pass found two more ways the death pose broke: dying while already on the ground, and dying in the air. This post goes through all three and ends with a checklist for your own death state.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-dead-block-c.jpg" alt="The melee combo did not block State.Dead, so its montage replaced the held death clip." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-dead-block-c-dark.jpg" alt="The melee combo did not block State.Dead, so its montage replaced the held death clip." loading="lazy">
</figure>

This is the second "dead player stands up" bug in a week. The [first one](./2026-11-22-pseudo-death-montage-stands-up-touching-segments) was inside the montage asset: a parked section end that landed on the next clip's standing frame. That fix was in place, and a plain death now held correctly. This one only happened when something else happened around the death.

## The report, and what a plain kill showed

The feedback was: the death animation doesn't seem to play, or the player dies and gets right back up, probably because damage keeps arriving after death.

The death in PSEUDO plays a montage with auto blend-out turned off, so the body is meant to stay on the floor until the death screen and retry. To see what happened I recorded, every tick and on both machines (listen server plus one client), the dying player's active montage, its section and position, and the pelvis height above the capsule floor. Standing is about 97 cm, lying is 23.8 cm.

A plain kill from a cheat was fine on both machines. So I tried the things the report suggested.

| # | Hypothesis | How it was checked | Result |
|---|---|---|---|
| 1 | The death montage is missing or not set | Checked the pawn data's reaction settings; plain kill | Ruled out: the clip played and held its last frame |
| 2 | Damage after death starts a hit reaction or a get-up | Read the health attribute set (returns early on `State.Dead`) and the reaction component (refuses when dead); sent Down, Stagger, Launch and a second kill to the corpse | Ruled out: nothing happened |
| 3 | The player's own input after death starts an ability | Kill, then attack presses from +0.3 s | Confirmed |
| 4 | Dying during a knockdown looks like getting up | Knockdown reaction, kill 1.2 s later while lying | Confirmed |
| 5 | Dying in the air | Launch reaction, kill 0.35 s later | Confirmed, separate bug |
| 6 | The hit reaction's cancel stops the death montage | Stagger, then kill 0.15 s later, client copy | Ruled out |

Damage after death was already ignored; the player's own input after death was not.

## Attack pressed on a corpse: how one missing tag undoes the death clip

With attack pressed from 0.3 s after the kill, the greatsword combo montage was playing on both machines 0.4 s in. When the combo ended, the body was standing in idle, pelvis at 98.9 cm.

The reason is spread over two engine behaviors:

- In GAS, `ActivationBlockedTags` is set per ability. PSEUDO had added `State.Dead` to the abilities that obviously needed it (dash, guard, ranged fire, dice, the hit reaction) one by one. The melee combo and seven others (jump, interact, weapon swap and stow, ladder, ledge hang, mantle, pole) never got it.
- The combo is a `LocalPredicted` ability, so it activates on the client and on the server. Its montage task calls `UAnimInstance::Montage_Play`, and `Montage_Play` stops every montage in the same group before it starts the new one. The held death montage was blended out and nothing ever brought it back.

Players mash attack when they're about to die, so this was the common case.

I moved the tag into the constructor of the base ability class that every PSEUDO ability derives from:

```cpp
ActivationBlockedTags.AddTag(PseudoGameplayTags::State_Dead);
```

There are no Blueprint abilities in the project that could skip the base constructor. If an ability ever has to run on a dead body, it can remove the tag in its own constructor.

The tag replicates, so there is still a short window on a real network where a client predicts an attack before it learns it is dead. For that I added a guard on the anim instance's `OnMontageStarted`: while the character is dead, any other montage that starts on the body is replaced by the death clip, at the position it had, on the next tick. The one-tick delay keeps the other montage's own end events from running inside its start. The guard also catches a reaction clip that replicates in after the death.

## Dying while already on the ground

The death clip starts standing and falls onto its back. When a player was killed while lying from a knockdown, the clip started from frame 0 anyway: the pelvis went from 23 to 101 cm in 0.25 s and then fell again. That looks exactly like getting up.

The server now checks, before it cancels the dying player's abilities, whether the active montage is the knockdown or launch reaction clip. It replicates that as an "already down" flag with the death info, and every machine starts the death section on its last frame, blended in from the reaction pose by the montage's 0.25 s blend-in. Measured after the fix: the pelvis peaked at 36.6 cm during the blend and stayed at 23.8 cm after.

The order matters: the check reads the active reaction montage, so it runs before the cancel.

## Dying in the air

The third case had nothing to do with montages. When a player was killed mid-air (launched by a hit, or jumping), the death code settled the corpse at once: `DisableMovement` and no capsule collision. In story maps players don't ragdoll, so the body simply stayed where it was, lying 231 cm above the floor.

Now a player who dies while falling keeps falling with no horizontal velocity, the capsule still collides with the world but ignores pawns, and the corpse settles on `Landed`. In the test the body fell from 233 cm to 1 cm in 0.65 s and settled on both machines, in the lying pose the whole way. Ragdoll deaths (enemies, and the arena mode) keep the old path.

## What the tests covered

Same harness after the fix, listen server plus one client, host and client deaths:

- plain kill, and kill followed by 6 light and 4 heavy attacks, 2 jumps and 2 dashes
- kill while lying from a knockdown, and kill in the air after a launch
- kill during a stagger, then a second kill, a stagger, a knockdown and a launch sent to the corpse
- kills by real enemy hits, with more swings tracing through the corpse
- a stagger montage forced straight onto a dead body on both machines, to fire the guard

Every run ended on the death section at 1.272 s, its last frame, with the pelvis at 23.8 cm on both machines. When the guard fired, the log said the death clip was put back at 1.27 s, with a one-frame pelvis bump to 32.6 / 41.8 cm before it snapped back. The late hits on the corpse did nothing at all.

One gap remains on paper: a player killed while falling into water would never get `Landed` and would stay falling or swimming until the retry. I haven't seen it or tested it.

## A checklist for your own death state

- Put "dead" in the base ability's `ActivationBlockedTags`, not ability by ability. Count how many abilities lack it today; in PSEUDO it was eight.
- A held last frame is only safe if nothing else can play a montage on that mesh. Either block every source, or bind `OnMontageStarted` while dead and put the death montage back.
- Test death with input after the death, not just a clean kill. Mash attack, jump and dash through the death clip.
- Test death during your other states: knocked down, in the air, mid-reaction. A clip that starts standing is wrong for a body that is already lying down, and a corpse that settles instantly is wrong for a body in the air.
- Decide anything that depends on the current montage before you cancel abilities.
