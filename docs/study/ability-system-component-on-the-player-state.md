---
title: "Putting the Ability System Component on the PlayerState"
description: "Why PSEUDO keeps the Gameplay Ability System component and attribute sets on the PlayerState instead of the character: owner vs avatar, initializing the ASC on both server and client, Mixed vs Minimal replication, swapping pawns without losing state, how to group attributes into sets, and the AttributeSet checklist I follow."
date: 2026-10-13
publishAt: 2026-10-29
outline: deep
---

# Putting the Ability System Component on the PlayerState

*Unreal Engine 5, C++, Gameplay Ability System*

The first structural decision in a GAS project is where the Ability System Component (ASC) lives. There are two usual answers: on the character, or on the PlayerState. On the character is simpler. On the PlayerState is what you want as soon as the player's pawn can be replaced while their abilities, buffs and stats should carry on.

In [PSEUDO](/blog/pseudo), that's not an edge case. The player has two pawns: the main character (MC) who walks around a small hub, and the sub character (SC) who fights in the stages. Both are the same C++ class with different data, and the game swaps between them. So the ASC and the attribute sets live on `APseudoPlayerState`. Enemies, which never swap and have no PlayerState, own their own ASC.

## Owner and avatar

GAS separates two roles that are easy to conflate:

- The **owner actor** is the object that owns the ASC and lives as long as the ability state should.
- The **avatar actor** is the physical thing in the world that abilities act through: plays montages, gets hit, moves.

With the ASC on the character, the owner and avatar are the same actor. Destroy the character and the ASC goes with it, along with every active effect, cooldown and attribute value.

With the ASC on the PlayerState, the owner is the PlayerState (which persists for the whole session) and the avatar is whichever pawn is possessed right now. Swapping pawns just means pointing the ASC at a new avatar.

```cpp
APseudoPlayerState::APseudoPlayerState()
{
    AbilitySystemComponent = CreateDefaultSubobject<UPseudoAbilitySystemComponent>(TEXT("AbilitySystemComponent"));
    AbilitySystemComponent->SetIsReplicated(true);
    AbilitySystemComponent->SetReplicationMode(EGameplayEffectReplicationMode::Mixed);

    // PlayerState replicates slowly by default; the ASC needs a higher rate.
    SetNetUpdateFrequency(100.f);
}
```

Two details in that constructor matter:

- **Replication mode.** The player's ASC uses `Mixed`: full Gameplay Effect info goes to the owning client (so its UI can show durations and stacks), while other clients only get tags and cues. Enemy ASCs use `Minimal`, since no client needs their effect details.
- **Net update frequency.** A PlayerState is a low-priority actor by default and updates rarely. Once it carries the ASC, attribute changes and tags ride on it, so it needs the same update rate you'd give a character.

## Initialize on both sides

This is the step most often half-done. The ASC needs `InitAbilityActorInfo(Owner, Avatar)` called on the server *and* on the owning client, and the two sides learn about the pawn at different moments:

- The **server** knows when the controller possesses the pawn: `PossessedBy`.
- The **client** only knows once the PlayerState has replicated to the pawn: `OnRep_PlayerState`.

```cpp
// Server: called when the controller possesses this pawn.
void APseudoPlayerCharacter::PossessedBy(AController* NewController)
{
    Super::PossessedBy(NewController);
    InitAbilityActorInfo();
}

// Client: called when the PlayerState replicates to this pawn.
void APseudoPlayerCharacter::OnRep_PlayerState()
{
    Super::OnRep_PlayerState();
    InitAbilityActorInfo();
}

void APseudoPlayerCharacter::InitAbilityActorInfo()
{
    APseudoPlayerState* PS = GetPlayerState<APseudoPlayerState>();
    if (!PS)
    {
        return;
    }

    AbilitySystemComponent = PS->GetPseudoAbilitySystemComponent();
    // Owner = PlayerState (persists), Avatar = this character (swappable).
    AbilitySystemComponent->InitAbilityActorInfo(PS, this);
}
```

If only the server path exists, everything looks right in a single-process test: abilities activate, damage applies. Then a client joins and its abilities do nothing, or its montages don't play, because the client's ASC never learned who its avatar is. The pawn's `GetAbilitySystemComponent()` returns the PlayerState's ASC, so anything that asks the pawn for its ASC still finds it.

PSEUDO's single player is a listen server with one player, so I test with two players in PIE from the first day. The check is short: on the client, `showdebug abilitysystem` should show a valid ASC with the right avatar.

## Swapping pawns without losing state

Because the state lives on the PlayerState, a pawn swap is: unpossess the old pawn, spawn the new one, possess it. What carries over is everything on the ASC: stacks, unlock state, shared attribute values. What changes is what each pawn is *allowed* to do:

- On possess, the new pawn's ability sets are granted.
- On unpossess, the old pawn's grants are removed through the handles stored when they were granted.

The result is that the hub character can't roll dice or use combat abilities, and the combat character gets them automatically, without either class knowing about the other. The per-pawn differences sit in a pawn data asset, covered in [One Character Class, Two Roles](/study/pawn-data-and-input-tags).

## Grouping attributes into sets

An attribute set is a class holding a handful of `FGameplayAttributeData` properties. Two rules guided how I split them:

1. **Group by shared rules and by who needs them.** Health and max health, plus the meta attributes that feed into health (`IncomingDamage`, `IncomingHealing`), go together because all damage and death handling flows through one place. Stamina and mana pools go together because they clamp and regenerate the same way. Combat stats that buffs and debuffs target go together.
2. **Don't make one set per attribute.** That multiplies boilerplate and replication overhead for nothing.

Then decide which pawns get which sets. In the first version of the framework, the hub character got only health and resources, the combat character got everything, and enemies got health and combat stats. The list of sets has grown since (primaries, resistances, status buildup), and [Stats and Level](/wiki/systems/stats-and-level) has the current one, but the grouping rule hasn't changed.

### One instance per set class

An ASC holds at most **one instance of each attribute set class**. Attributes are looked up by class and property, so two instances of the same class on one ASC would be ambiguous. If two pawns need different numbers of something, that's two attributes, not two copies of a set.

### How sets get added

| Method | How | When to use it |
|---|---|---|
| Constructor | `CreateDefaultSubobject<USomeSet>()` in the PlayerState | First pass. Every pawn gets every set. |
| Data-driven | An ability set asset lists set classes; on grant, `NewObject` + `ASC->AddSpawnedAttribute()` | When different pawns should carry different sets |

With the data-driven method, a pawn swap should **keep the shared sets** and only add or remove the rest. Removing a set and creating it again resets its values, which would undo the whole point of keeping the ASC on the PlayerState.

## The AttributeSet checklist

Every set I write goes through this list:

- **Accessor macros on every attribute** (getter, setter, initter).
- **`OnRep_<Attribute>` with `GAMEPLAYATTRIBUTE_REPNOTIFY`**, registered in `GetLifetimeReplicatedProps` with `REPNOTIFY_Always`. Without the rep notify, the server value replicates but client-side listeners (the UI) never hear about it.
- **Clamp in `PreAttributeChange`**, for example the current value against its max.
- **Resolve meta attributes in `PostGameplayEffectExecute`.** `IncomingDamage` is not a stat; it's a mailbox. The effect writes damage into it, and the set turns that into lost health, then zeroes it.
- **Decide per pool what happens when the max changes.** If max health goes from 100 to 150, does current health stay at 80, or scale to 120? Either is fine; not deciding is how you get a full-health bar that isn't full.

## When the character is the better home

If the pawn is never replaced and death means a full reset anyway, putting the ASC on the character is simpler and perfectly valid: no `OnRep_PlayerState` path to forget, and AI and players share one setup. The PlayerState is worth its extra setup when something about the player has to outlive the body it's currently in.

That extra setup has one more cost worth knowing: anything bound to the ASC from the pawn side outlives the pawn too. On an earlier project that used the same layout, a dead pawn's health callback kept firing until I unbound it on unpossess ([Moving Health into GAS](/blog/2026-10-02-tumble-teams-gas-health-and-head-ui) has the details). With a persistent ASC, every delegate a pawn binds needs a matching unbind when that pawn goes away.
