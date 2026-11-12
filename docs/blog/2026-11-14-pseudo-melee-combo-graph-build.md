---
title: "Building a UE5 Melee Combo With One Gameplay Ability: A Combo Graph, Montage Sections and a Predicted Advance"
description: "How I built PSEUDO's first melee combo in Unreal Engine 5 with GAS: a data-asset combo graph walked by one runner ability, anim notify states that only send gameplay events, an input buffer, perfect-input timing measured from hand speed, and a client-predicted combo advance the server checks."
date: 2026-11-14
workedOn: 2026-10-17
publishAt: 2026-11-14
track: "Melee combo"
category: "Build Logs"
sidebar: "Melee Combo Graph"
image: /blog/pseudo-combo-graph-c.jpg
outline: deep
tags: [UE5, GAS, Animation, Combat, Multiplayer]
---

# Building a UE5 Melee Combo With One Gameplay Ability: A Combo Graph, Montage Sections and a Predicted Advance

This is the build log of PSEUDO's first melee combo: five greatsword hits, an input buffer, a "perfect input" bonus for pressing on the beat, and a listen server that has to agree with the client about which attack is playing. If you're building a combo in UE5 with the Gameplay Ability System, the parts worth taking are: keep the combo as data and walk it with one ability, let anim notifies send events and nothing else, place timing windows by measuring the swing instead of the clip length, and predict the advance on the client with a cheap server check.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-combo-graph-c.jpg" alt="Five greatsword hits as one data-driven combo graph walked by a single ability." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-combo-graph-c-dark.jpg" alt="Five greatsword hits as one data-driven combo graph walked by a single ability." loading="lazy">
</figure>

The rules as a player sees them (graphs per weapon, perfect inputs, cancels) are on the wiki's [Combos and Cancels](/wiki/pseudo/systems/combo-and-cancels) page. This post is about how the first version was built.

## A graph in a data asset, not five abilities

The first content was a straight chain, A → B → C → D → E, with E as a finisher. A straight chain could be a list, or five abilities that activate each other. I chose a graph from the start, because every branch I already knew about (light and heavy mixes, an attack out of a dash, a counter after a parry) is one more transition in a graph and a special case in a list.

The data is a data asset, one per weapon:

- A **node** is one attack: a montage, a section name in it, and an attack spec (damage multiplier, perfect-input step and cap, play rate, and the Luck fields that widen the perfect window).
- A **transition** is an input tag plus required and blocked gameplay tags, pointing at the next node. The graph also has entry transitions for the first press. The first matching transition wins.

One gameplay ability, the combo runner, walks the graph. It doesn't know what a greatsword is; it asks the pawn's data for the graph mapped to the current weapon tag. A new attack is a new node and transition in data.

Two small editor details made the asset usable. A `GetOptions` meta function on the next-node field gives a dropdown of the node IDs that exist in the asset, so a typo can't point a transition at nothing. And the node naming rule is `<Input>_<Step>[_<Role>]` (`Light_1`, `Light_1_Recovery`), with the montage section using the same name as the node. The role, such as finisher, lives in a node tag rather than the ID, and the weapon isn't in the name because both the montage and the graph are already per weapon.

## Notifies that only send events

Paragon's attack animations came with their own notifies. I replaced all of them with one generic C++ anim notify state that sends a begin and an end gameplay event to the owner's ability system, with the animation and the window length in the payload, and does nothing else. Three Blueprint children set the tags: a combo window, a perfect window and a hit window.

Keeping logic out of the notifies means the combo ability decides what a window means, and the same notify class can serve other systems. One rule I added: the ability ignores events whose payload animation isn't its own montage, so a notify from an unrelated montage can't open a combo window. That also means the notify states have to sit on the montage's own notify track, not inside the source sequences.

## Section names had to be written from C++

The combo montage holds eight clips in order: four attacks with their recovery clips (the fourth attack has no recovery) and the finisher. Each attack needed a section, and the recovery sections needed links (`Light_1` → `Light_1_Recovery`, nothing after that) so a single hit plays its recovery and ends.

I build assets with editor Python where I can, but Python can't edit a montage's `CompositeSections`, and the section lane in the montage editor isn't something I could drive from a script either. I wrote a small editor-only C++ function library, `ReplaceMontageSections(Montage, Names, Times, NextSections)`, and called it from Python. Two more editor traps from the same work: an `AnimSegment`'s start position is read-only from Python, so I rebuilt segments with `export_text` / `import_text`, and a montage only recomputes its length in `PostLoad`, so after changing segments I saved and restarted the editor.

(The montage editor's own section tools are described in Epic's [Animation Montage](https://dev.epicgames.com/documentation/en-us/unreal-engine/animation-montage-in-unreal-engine) docs; I only needed code because I wanted the layout reproducible.)

## Two buffers for two different problems

Inputs pressed a little early shouldn't be lost. There are two cases, and I solved them in two places:

- **The combo ability is already running.** The ability system component hands an attack press to the active ability first, instead of trying to activate a new one. The combo stores a press made up to 0.2 s before the combo window and fires it when the window opens.
- **The ability can't activate yet** (it's blocked by another state). A shared activation buffer in the ability system component stores the blocked input tag and its time, 0.15 s by default, and retries it every input update. Jump and, later, dash and break-fall use the same buffer.

## Placing windows by hand speed, and why mashing broke the first version

My first windows were laid out from the clip lengths: the combo window opened 0.2 s into each attack. Testing showed two problems.

First, the source clips are "slow" variants where the swing ends early and the rest of the clip is a hold. I measured the hand speed to find where each swing actually ends: 0.33, 0.47, 0.33, 0.43 and 0.53 s after the start of the five attacks. The recovery clips also start at frame 30 or 32 of the attack, not at its end, so the old layout made the hand pop 30, 19 and 7 cm in a single frame between attacks. I trimmed the attack segments to match.

Second, mashing was too fast. With the window opening at +0.2 s, every buffered press fired the next attack before the swing had finished. So the windows moved:

- The **combo window** opens at the end of the swing and closes 0.35 s into the recovery clip.
- The **perfect window** is the end of the swing to 0.15 s after it.
- The **hit window** covers the swing itself.

And one rule: **a buffered press still chains, but never counts as perfect.** Perfect means you pressed on the beat, not early. After the change, mashing every 0.1 s advanced exactly at each swing end with no perfects, on-time presses were all perfect, and slow presses at 0.7 s spacing chained without the bonus.

The perfect bonus is additive and capped: +0.1 per perfect hit, up to +0.5, reset by a non-perfect advance or the end of the combo. In the first version it was only logged; damage came later.

The fourth attack, which has no recovery clip, showed one more trap: the montage blends out about 0.25 s before its section ends, and the blend-out ended the ability, so a window placed in the last 0.1 s of that attack could never be hit. I ended its window before the blend-out.

## The client predicts, the server checks one thing

PSEUDO uses a listen server, so a client's combo advance has to show up on the server. The ability is locally predicted: the attacking client decides the advance from its own windows. The first version relied on montage replication for the section jumps, and the server's copy of the ability never updated its current node, so the server didn't know which attack was playing.

I added a server RPC on the ability system component, `ServerAdvanceCombo(Handle, NextNode, bPerfect)`. The server ability checks only that the transition exists in the graph from its current node (`HasTransition`); if not, it ends the ability on the server. It trusts the client's window timing and perfect flag. For PvE co-op that's enough, and the stricter checks I'd want for PvP are listed below.

I also changed how a node plays. Instead of jumping to a section in the running montage, every node restarts the montage task at its own section, so the 0.15 s blend-in crossfades between attacks.

In tests with a client as the attacker, the full chain and the perfect stack (0.10 → 0.40) worked, a press 0.13 s early was consumed when the window opened, and the server's copy of the client's pawn stayed within one frame of the client. Across 12 advances the server rejected none. The same chain worked with the host attacking.

## Smaller decisions

- **No root motion.** The attack clips are in place. Forward movement on swings was left for later (motion warping or code), and the character faces the input direction when an attack starts.
- **Server animation must tick unseen.** The hit window events come from notifies, so the server's copy of a mesh has to tick its animation even when nothing renders it.
- **Gating.** The ability only activates while the current weapon tag is under `Weapon.Melee`.

## What changed later

The combo was later split into a light chain on the left mouse button and a heavy chain on the right, using the same graph and the same runner; only the data changed, which was the point of the graph. Still open from this first pass: server-side checks of window timing and the perfect flag against the server's montage position, needed before any PvP mode. Hit detection and damage are in the [next build log](./2026-11-14-pseudo-melee-hit-detection-build).
