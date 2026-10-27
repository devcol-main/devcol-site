---
title: "One Character Class, Two Roles: Pawn Data and Input Tags"
description: "How PSEUDO runs a hub character and a combat character on one C++ class: a pawn data asset that holds abilities, input, animation layers and meshes, game modes that pick it, Enhanced Input routed through gameplay tags into the ability system, and mapping contexts per role. Plus what this buys: unlocks, per-stage weapon restrictions and rebinding without touching input code."
date: 2026-10-13
publishAt: 2026-10-30
outline: deep
---

# One Character Class, Two Roles: Pawn Data and Input Tags

*Unreal Engine 5, C++, Gameplay Ability System, Enhanced Input*

[PSEUDO](/blog/pseudo) has two player-controlled characters. The main character (MC) walks around a small hub: decorate, shop, pick a stage. The sub character (SC) fights in the stages: combos, dodges, dice. They move differently, look different, have different abilities and different controls.

The obvious structure is two classes. I went with one: `APseudoPlayerCharacter` is the pawn for both, and everything that differs is data. This note covers that data asset and the input setup that makes it work, since the two only pay off together.

## Why not two classes

Two subclasses would each grow their own copy of movement setup, camera setup, ability initialization, and input binding. Every fix would need doing twice, and every feature would start with "which class does this go in". More importantly, the differences between MC and SC are not behavior. They're configuration: which abilities are granted, which keys mean what, which mesh and animation layers to use. Configuration belongs in an asset.

The ability state itself lives on the PlayerState, not the pawn, so swapping between the two roles keeps everything the player has earned. That part is in [Putting the Ability System Component on the PlayerState](/study/ability-system-component-on-the-player-state).

## The pawn data asset

```
UPseudoPawnData (UPrimaryDataAsset)
 ├─ PawnClass            TSubclassOf<APseudoCharacterBase>
 ├─ AbilitySets          TArray<UPseudoAbilitySet*>      // abilities + attribute sets + startup effects
 ├─ InputConfig          UPseudoInputConfig*
 ├─ InputMappings        TArray<{ UInputMappingContext*, Priority }>
 ├─ DefaultAnimLayer     TSubclassOf<UAnimInstance>
 └─ Cosmetics
     ├─ BodyMesh         USkeletalMesh*                  // required
     ├─ BodyAnimClass    TSubclassOf<UAnimInstance>      // required
     ├─ FaceMesh         USkeletalMesh*                  // optional; empty = no face component
     ├─ FaceAnimClass    TSubclassOf<UAnimInstance>      // optional
     └─ FaceAttachSocket FName                           // optional
```

Two assets fill it in:

| Asset | Pawn | Ability sets | Input mappings | Anim layer |
|---|---|---|---|---|
| `DA_Pawn_MC` | `BP_MC` | `AS_Hub` | `IMC_Default`, `IMC_Hub` | unarmed |
| `DA_Pawn_SC` | `BP_SC` | `AS_Combat` | `IMC_Default`, `IMC_Combat` | melee weapon layer |

A few things about the shape:

- **An ability set is a bundle**: the abilities to grant, the attribute sets to add, and the effects to apply at start. Granting a set returns handles, and removing the set later uses them. That's what makes "the hub character can't roll dice" a property of the data instead of an `if` in the dice code.
- **Cosmetics have optional parts.** The SC is a Paragon body with a separate MetaHuman face, so it needs a face mesh, its own anim class and an attach socket. A body that includes its own head leaves those empty and no face component is created. (Getting that face to sit on a body it wasn't built for took a [five-part series](/blog/2026-10-14-pseudo-metahuman-paragon-1-setup).)
- **It's a `UPrimaryDataAsset`**, so the asset manager can find and load it by ID.

### Who picks the pawn data

Each game mode names a default: the hub game mode picks `DA_Pawn_MC`, the stage game mode picks `DA_Pawn_SC`. A shared base game mode handles spawning the right `PawnClass` and handing the data to the pawn. Adding an arena mode later is one more subclass with one more default, not a new character.

## Input through gameplay tags

The second half is input. In a plain Enhanced Input setup, the character binds each Input Action to a function: `IA_Jump` calls `Jump()`. That's direct, and it doesn't survive contact with an ability system, because what a key does now depends on which abilities are granted.

So input goes through tags. An input config data asset maps each Input Action to a gameplay tag:

```
UPseudoInputConfig
  Native actions   IA_Move ↔ InputTag.Move,  IA_Look ↔ InputTag.Look, ...
  Ability actions  IA_Ability_Q ↔ InputTag.Ability.Q, ...
```

The two lists are handled differently:

- **Native actions** (move, look) bind to C++ handlers on the character. They run every frame and have nothing to do with abilities, so there's no reason to route them through GAS.
- **Ability actions** call two functions on the project's ASC subclass: `AbilityInputTagPressed(Tag)` and `AbilityInputTagReleased(Tag)`. These are my own functions, not engine API. They look through the granted abilities for ones whose dynamic tags contain that input tag and activate them (or forward the press to an ability that's already running).

The character's binding code never mentions a specific ability. It binds "this action sends this tag", and the ASC decides what the tag means right now.

### Mapping contexts per role

Input Mapping Contexts (which physical key triggers which action) come from the pawn data too, and are added in `PawnClientRestart`, which runs on the owning client when the pawn is (re)possessed:

| IMC | Contents |
|---|---|
| `IMC_Default` | Move, look, jump |
| `IMC_Hub` | Interact |
| `IMC_Combat` | Attack, dodge, dice, guard, and the rest of the combat set |

`IMC_Default` is shared, so both characters walk and look identically. Each role adds its own context on top, and since the list comes from the pawn data, a new role brings its own contexts without any change to the character class.

## What this buys

The point of the indirection shows up in features that would otherwise each need their own input code:

- **Progressive unlocks are just grants.** The Curse dice type unlocks in Stage 1, not in the tutorial. Before that, the ability isn't granted, so its input tag finds nothing and the key does nothing. No "is unlocked" check in the input path.
- **Per-stage weapon restrictions are tag blocks.** Stage 1 is melee only, Stage 2 ranged only. The stage adds a blocking tag for the disallowed `Combat.Mode.*`, and abilities that require that mode fail their activation check. The input path doesn't know stages exist.
- **Rebinding is data.** Changing which key does what is an edit to a mapping context, and the tag routing is unchanged.
- **AI uses the same abilities.** Enemies activate abilities by tag too (`TryActivateAbilitiesByTag`), so an attack ability doesn't care whether a key or a State Tree asked for it.

## The trade-off

Indirection costs readability. "What does pressing E do" is no longer answerable by reading the character class: you follow the mapping context to the action, the input config to the tag, and the ability sets to whichever ability carries that tag. A typo in a tag fails silently, too: the key just does nothing. In practice the debugging starts with `showdebug abilitysystem`, which lists what's granted, and then the question is always the same one: is the ability granted, and does its dynamic tag match the input tag exactly?

I first built this tag routing on an earlier project, and that write-up has the binding code step by step: [Data-Driven Input and Preparing for GAS](/blog/2026-10-03-tumble-teams-devlog-02-input-and-pawn-init).
