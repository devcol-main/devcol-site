---
title: "Linked Anim Layers for Weapon Modes: One Skeleton, One Anim Blueprint, Swappable Layers"
description: "How PSEUDO animates one character with two weapon modes: logic in a C++ AnimInstance with a thread-safe update, a thin Animation Blueprint that calls an Anim Layer Interface, one layer Blueprint per weapon mode swapped at runtime with LinkAnimClassLayers, a direct offline IK retarget from a second Paragon hero for the melee set, and when a retarget hub would actually be worth it."
date: 2026-10-13
publishAt: 2026-11-02
outline: deep
---

# Linked Anim Layers for Weapon Modes: One Skeleton, One Anim Blueprint, Swappable Layers

*Unreal Engine 5, C++, Animation Blueprints, IK Retargeter*

The combat character in [PSEUDO](/blog/pseudo) fights two ways: with a greatsword and with dual pistols. The body is Paragon's Twinblast, a pistol hero, so the ranged animations come with the character. The sword animations don't exist for that body at all; they come from another Paragon hero, Kwang, and have to be retargeted.

That gives the animation setup three problems to solve at once: how to swap a whole set of animations when the weapon changes, where the animation logic should live, and how to get another character's animations onto this skeleton without paying for it every frame. This note is the structure I settled on and why.

## The structure in one picture

```
UPseudoAnimInstance (C++)
  - Ground speed, acceleration, direction, is-falling, weapon mode
  - Gameplay tag → property map for State.* / Combat.Mode.*
  - Gather values on the game thread (NativeUpdateAnimation),
    use them in NativeThreadSafeUpdateAnimation

ABP_Twinblast                        parent: UPseudoAnimInstance
  └─ Locomotion state machine → calls Linked Anim Layers

ALI_PseudoLayers                     Anim Layer Interface
  ├─ FullBody_Idle
  ├─ FullBody_Locomotion
  ├─ FullBody_Jump
  └─ UpperBody_Action                attack / shoot slot

Layer Blueprints (Twinblast skeleton)
  ├─ ABP_Layers_Twinblast_Ranged     native Twinblast animations
  └─ ABP_Layers_Twinblast_Melee      Kwang animations retargeted to Twinblast
```

Four pieces, each with one job: C++ computes, the main Animation Blueprint decides *which state* the body is in, the interface names the slots that differ per weapon, and each layer Blueprint fills those slots for one weapon.

## Anim Layer Interfaces and Linked Anim Layers

An **Anim Layer Interface** is an asset that declares named animation functions, called layers, without implementing them. Each layer takes a pose in (optionally) and returns a pose. Here there are four: idle, locomotion, jump, and an upper-body action slot.

The main Animation Blueprint implements the interface too, but only to *call* the layers from its state machine. The Locomotion state doesn't play a run cycle; it calls `FullBody_Locomotion` and uses whatever pose comes back. Jump calls `FullBody_Jump`, and so on.

A **layer Blueprint** is a separate Animation Blueprint, on the same skeleton, that implements the interface with real animations. The ranged one plays Twinblast's pistol idle, run and jump; the melee one plays the sword versions. Neither knows anything about state machines or transitions. It only answers "what does locomotion look like with this weapon".

At runtime, one call links a layer Blueprint into the running main Blueprint:

```cpp
GetMesh()->LinkAnimClassLayers(LayerClass);
```

From then on, every call to a layer in the main Blueprint runs the linked class's implementation. Link the melee class, and the same state machine now produces sword locomotion. Nothing about states, transitions or blending has to be duplicated.

### Why not one big Anim Blueprint with a weapon enum

The common alternative is a blend-by-enum node in front of every animation: if mode is ranged play this, if melee play that. It works for two weapons, but it has costs:

- **Both animation sets are referenced, so both are loaded**, even in a stage where only one weapon is allowed. A layer class that isn't linked can stay unloaded, as long as nothing else holds a hard reference to it.
- **Every new weapon touches the main Blueprint**, which is the most fragile asset in the character. With layers, a third weapon mode is a new layer Blueprint and nothing else.
- **State machine changes multiply.** With layers, a new state (say, a landing recovery) is added once in the main Blueprint and each layer just implements one more function, or leaves the interface default.

## The weapon mode switch

The switch is driven by gameplay tags on the character's Ability System Component. The character registers for tag changes on `Combat.Mode.*` and routes everything through one entry point:

| Mode tag | Linked layer | Visible weapons |
|---|---|---|
| `Combat.Mode.Ranged` | `ABP_Layers_Twinblast_Ranged` | Pistols |
| `Combat.Mode.Melee` | `ABP_Layers_Twinblast_Melee` | Greatsword on `hand_r` |

Using a tag instead of a function call from the weapon code has a nice side effect: anything that can block a tag can block a mode. PSEUDO's stages restrict weapons (the first stage is melee only), and that restriction is just a blocked mode tag. The animation side never has to know about stages.

Which layer a character starts with is data, not code. The pawn data asset has a default anim layer, so the hub character and the combat character can share one class (see [Pawn Data and Input Tags](/study/pawn-data-and-input-tags)).

## Logic in C++, thin Blueprints

The Animation Blueprint graph is the worst place in a project to keep logic: hard to diff, hard to review, easy to break by moving a node. So `UPseudoAnimInstance` does all of the math (speed, acceleration, direction, falling, current weapon mode) and the Blueprints only wire states and animations.

Two details make the C++ side work well:

- **Gather on the game thread, use on the worker thread.** `NativeUpdateAnimation` runs on the game thread, where it's safe to read the owning character and its movement component. It copies what's needed into member variables. `NativeThreadSafeUpdateAnimation` runs on a worker thread and computes from those copies only. Animation updates for many characters can then run in parallel, which matters once a stage has a crowd of enemies.
- **A gameplay tag to property map.** GAS provides `FGameplayTagBlueprintPropertyMap`, which mirrors tags on the Ability System Component into boolean or float properties on the Anim Instance, updated automatically when the tags change. "Is guarding", "is in combat mode" and similar flags come for free, without a polling function or a cast in the graph.

## Getting a sword moveset onto a pistol body

Kwang and Twinblast are both Paragon heroes, but they have different skeletons and different proportions. Unreal's IK Retargeter maps animation from one to the other. Three choices shaped how I used it.

### Direct, not through a hub

A common pattern is retargeting everything to a shared "hub" skeleton (often the UE5 Manny) and from there to each body. For one source and one target, the hub only adds a second hop, and every hop loses a little: a hand drifts, a foot slides. So the melee set goes Kwang → Twinblast in one step:

| Asset | Purpose |
|---|---|
| `IK_Kwang` | IK Rig on the Kwang skeleton |
| `IK_Twinblast` | IK Rig on the Twinblast skeleton |
| `RTG_Kwang_to_Twinblast` | IK Retargeter between the two |

A hub becomes worth it later, when three or more bodies need to share one common set (locomotion, dodge, hit reactions, death). Then authoring once and retargeting out is cheaper than maintaining a direct retargeter between every pair.

### Offline, not at runtime

Retargeting can run live, every frame. For a shipping game there's no reason to pay that cost: the retargeted animations are **baked into new assets on the Twinblast skeleton** with the retargeter's *Export Selected Animations*, and only the melee set is exported. At runtime, the melee layer plays ordinary Twinblast animations that happen to have been made from Kwang's.

### The steps that mattered

1. Build both IK Rigs with automatic humanoid chain generation, then check spine, neck, arm and leg chains by hand.
2. **Align the retarget poses.** If one skeleton's reference pose is an A-pose and the other a T-pose, every arm comes out bent. This is the single most common retargeting mistake and the first thing to check.
3. Turn on IK goals for hands and feet, then tune stride and root settings.
4. Preview two or three representative attacks and fix problems *before* exporting anything.
5. Export only what you need.
6. **Author montages and notifies on the retargeted assets, not the sources.** Hit windows and combo windows belong to the animation the game actually plays. Putting them on the Kwang originals would mean re-exporting every time a window moved.

### What to check for a weapon retarget

- **Is the weapon a bone or an attachment?** If the source's sword bone only follows the hand, attach a sword mesh to the target's hand socket and ignore the bone. If it moves independently (spins, throws), it needs its own handling.
- **Does the target have weapons baked in?** Twinblast's pistols have to be hidden in melee mode, either as separate components or by hiding them in the mesh.
- **Two-handed grips** drift when proportions differ. Hand IK on the off hand plus a socket offset on the weapon fixes most of it. (When the grip went wrong anyway, it went very wrong: [A Greatsword at the Hip](/blog/2026-10-19-pseudo-greatsword-grip-and-hits).)
- **Root motion distance** should scale with the height ratio, or lunges cover the wrong distance. Root motion montages also need to go through the ability system (`PlayMontageAndWait`) to stay in sync in multiplayer.
- **Visual weight.** A heavy greatsword swing on a lighter body can look wrong even when it's technically correct. That's a direction call (play rate, weapon size), not a retargeting bug.

## What this costs

Linked layers are not free of friction. A layer Blueprint is its own Anim Instance and doesn't share the main Blueprint's variables, so anything a layer needs comes from the owning character, a shared C++ base, or a layer input pin. And debugging is split across two assets: when locomotion looks wrong, the question is first "which layer is linked right now". Both are cheap compared to one Blueprint that grows a branch for every weapon.
