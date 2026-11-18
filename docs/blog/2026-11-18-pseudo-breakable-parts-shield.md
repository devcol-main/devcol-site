---
title: "Breakable Body Parts With Their Own HP in UE5 GAS: Bone-to-Part Lookup, a Meta Attribute, and a Shielded Hit That Played No GameplayCue"
description: "How I built Monster Hunter-style part damage for enemies in Unreal Engine 5: a replicated part HP component instead of attributes, resolving the hit bone by walking up the skeleton, an IncomingPartDamage meta attribute fed by the damage execution, a back weak point that only counts from behind, a shield that breaking parts drops, and why GAS skipped the hit cue when a shielded hit produced no modifier output."
date: 2026-11-18
workedOn: 2026-10-21
publishAt: 2026-11-18
track: "Part health"
category: "Build Logs"
sidebar: "Breakable Parts and Shield"
image: /blog/pseudo-part-break-c.jpg
outline: deep
tags: [UE5, GAS, Combat, Multiplayer, C++]
---

# Breakable Body Parts With Their Own HP in UE5 GAS: Bone-to-Part Lookup, a Meta Attribute, and a Shielded Hit That Played No GameplayCue

This build log covers breakable parts: an enemy's arms, head and back each have their own health, a part breaks once when it runs out, and a boss shield drops when the right parts break. It's the base the first boss stands on. If you're adding the same to a GAS project, the useful parts are: keep part health in a component with a replicated array rather than in attribute sets, map a hit bone to a part by walking up its parents, route part damage through a meta attribute so it lands after body damage, and make sure a fully blocked hit still produces a zero-value modifier, or its GameplayCue never fires.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-part-break-c.jpg" alt="Part HP sits in a replicated component; a zero-damage modifier keeps shielded hit cues alive." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-part-break-c-dark.jpg" alt="Part HP sits in a replicated component; a zero-damage modifier keeps shielded hit cues alive." loading="lazy">
</figure>

How this feels in the boss fight (which parts Rampage has, what breaking them gives you) is on the wiki's [Rampage page](/wiki/pseudo/systems/rampage). This post is the machinery underneath.

## Body HP plus part HP, Monster Hunter style

I looked at two models. In one, a part is a separate health pool and hitting it does not touch the body. In the other, which Monster Hunter uses, a hit on a part **always** damages the body as well, and the part keeps its own pool on the side. When the part pool reaches 0, it breaks once.

I took the second. Part damage then never makes a fight longer, it only adds a goal inside it. It also carries over to later uses I had in mind: breaking parts off zombies and ranged headshots. A broken part takes body damage only afterwards, with its multiplier still applied.

Each part is defined in the enemy's data asset with: a gameplay tag (`Part.Head`, `Part.Arm.L`, `Part.Arm.R`, `Part.Back`), the root bones that belong to it, its HP, a damage multiplier, an optional back-only flag with a half angle, and the reaction it plays when it breaks. The data asset's `IsDataValid` checks that tags are unique, bones are set, and shield groups only name parts that exist.

## Why part HP isn't an attribute set

GAS attributes were the first thing I considered, since health already lives in an attribute set. The problem is that an attribute set has a fixed list of attributes compiled into a class, and enemies have different numbers of parts. A dummy has four, a boss has three, a later zombie may have more.

So part HP lives in a component on the enemy character, holding a plain `TArray` replicated with `ReplicatedUsing`. I considered a fast array serializer, but it needs the `NetCore` module added to the build file, and with a handful of parts per enemy the full-array replication costs nothing worth saving.

## From hit bone to part: walk up the skeleton

A melee hit already arrives with a bone name, from the Physics Asset body the sweep touched. Listing every bone of an arm in the data would be tedious and fragile, so a part lists only its **top** bone. To resolve a hit, the component walks up from the hit bone through its parents, and the first bone that appears in some part's `RootBones` wins.

This mattered as soon as the boss arrived. Its Physics Asset has bodies on the forearm, upper-arm twist bones and hands, but none on `upperarm_l` / `upperarm_r` themselves. With the parent walk, a hit on `lowerarm_l` or `hand_r` still resolves to the arm part whose root is `upperarm_l` / `upperarm_r`. On the test dummy, `spine_01` had no physics body, so the back part starts at `spine_02`.

The back is the one directional part. It only counts when the attacker is behind the enemy, within 60 degrees of straight behind. A hit on the same spine bones from the front is plain body damage.

## Where the part damage enters GAS

The custom damage execution computes the hit as before and then does two things with the part:

- It applies the part's multiplier to the hit damage. A head hit at x1.5 logged 27.50 against 18.33 for the pelvis.
- It writes a second output, a meta attribute called `IncomingPartDamage`, **after** the body damage output.

A meta attribute is a value that exists only to be consumed by the attribute set; it is never shown or stored. The health set picks up `IncomingPartDamage` on the server and hands it to the part component, which lowers the right part's HP and checks for a break. Health stays the single place where damage turns into lost health, and the part rule hooks into that place instead of running beside it.

On a break the component sends `Event.Part.Broken` with the part's tag as the target tag, fires `GameplayCue.Part.Broken`, and plays the part's break reaction (a stagger on the dummy). The cue notify is a C++ class with a Blueprint child; the GameplayCue map only picked up the new Blueprint after an editor restart.

## The shield: body damage off, parts still on

The shield gimmick is a tag, `State.Shielded`. While the enemy has it, the execution gives no body damage, so there is no reaction and no groggy build-up either. Part damage still goes through.

Breaking the shield works by groups. A group is a list of parts, and when every part in one group is broken, the shield drops. I wanted two ways to do it, so the dummy has two groups: both arms together, or the back on its own. The arms are open from the front while you defend; the back is faster but means getting behind the enemy.

A drop removes the shield and puts the enemy into a full groggy stun, which is the punish window. The groggy replaces the break reaction of the last part, so the stun isn't cut short by a stagger. When the shield goes back up, the parts in its groups are reset to full.

## The shielded hit that played no cue

The first test pass failed in one place: a shielded hit on a bone that belongs to no part played no hit cue at all. No flash, no sound, nothing to tell the player the hit landed on a shield.

The reason is how GAS decides whether to fire an effect's GameplayCues. They fire when the effect actually executed a modifier. With the shield up and no part involved, the execution produced no output at all, body damage was skipped and there was no part damage, so GAS saw an execution that changed nothing and skipped its cues.

The fix was to always output the body damage, as 0, while shielded. A zero-value modifier is still a modifier, so the cue fires. In the retest, every hit on a shielded dummy showed the cue on both machines and logged `shielded: body damage 10.08 blocked`, while arm part damage still applied. The shielded cue draws a bigger cyan sphere for now, as a placeholder until there's real VFX.

If a hit in your project can be fully absorbed (shields, invulnerability, a zero-damage element), check that its cue still plays. The [Gameplay Effects](https://dev.epicgames.com/documentation/en-us/unreal-engine/gameplay-effects-for-the-gameplay-ability-system-in-unreal-engine) page describes executions and cues as separate properties of an effect, but cues fire based on what the execution actually output.

## Checks you can copy

- Hit a part from the host and from a client and compare the logged part, its HP after the hit, and the client's replicated value. The log line looked like `part Part.Arm.R (bone hand_r) took 10.1: 39.9/50` on both.
- Break a part, then hit it again: it should log one break and body-only damage after.
- Hit the back from the front and from behind; only the second should log the back part.
- Hit a shielded enemy on a non-part bone and look for the cue, not only the damage numbers.
- Regression: area attacks and the full combo on a target with parts should behave exactly as before.

Debug draw for parts is behind a console variable, and two cheats drove most tests: one toggles the shield and one applies damage to a named bone, optionally from behind. One testing trap: a break triggered from an editor Python console command only showed the cue on the server, because those commands run in the editor's context, not the game's. Breaks made by real combo hits showed it on both machines.

## Not built yet

A part HP bar in the UI, elements per part, break VFX and sound, and visible damage on a broken part (a mesh swap or a hidden piece). The next step, the boss that uses all of this, is in [the next build log](./2026-11-18-pseudo-boss-phases-statetree).
