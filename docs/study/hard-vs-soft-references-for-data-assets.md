---
title: "Hard vs Soft References in Gameplay Data Assets"
description: "When a data asset should hold a TObjectPtr and when it should hold a TSoftObjectPtr in Unreal Engine 5: what each one loads and when, the reference-chain problem, who should own the async load, a fallback rule for a missed preload, and why I made combo montages soft in PSEUDO before the second weapon existed."
date: 2026-10-16
publishAt: 2026-10-30
outline: deep
---

# Hard vs Soft References in Gameplay Data Assets

*Unreal Engine 5, C++*

A data asset is a convenient place to collect everything a feature needs: a weapon's combo, the montages each attack plays, the effects and sounds that go with them. The catch is in how those fields are typed. A pointer field in a data asset is not just a reference, it's a load instruction. Whatever the asset points at gets loaded when the asset loads, and whatever *those* assets point at loads too.

I hit this decision while building the combo graph for [PSEUDO](/blog/pseudo)'s first weapon, and I wrote it down as the project's first decision record because the same choice comes up for every data asset after it.

## What each reference type does

| | Hard (`TObjectPtr<T>`) | Soft (`TSoftObjectPtr<T>`) |
|---|---|---|
| What the asset stores | A direct pointer | The asset's path only |
| When the target loads | Together with the data asset | When code asks for it |
| Code at the use site | Use it directly | Load it, then `Get()`, and check for null |
| Memory | Everything referenced stays resident | Only what was loaded |
| Main risk | Reference chains pull in large assets | A hitch if it's loaded at the moment it's needed; you manage the load's lifetime |

`TSoftClassPtr<T>` is the same idea for classes (an ability class, an anim layer class) instead of objects.

The hard reference is the default for a reason. It's simpler: no load call, no null check, no lifetime to manage. The cost only shows up when the reference graph grows.

## The reference-chain problem

A montage is not small on its own terms. It references its animation sequences, which reference the skeleton. Notifies on the montage can reference Niagara systems and sound cues. If a data asset holds the montage by hard pointer, loading the data asset loads all of that.

That's fine when the data asset is only loaded at the moment the montage is about to play. It stops being fine when the data asset is loaded by something that doesn't need the montage yet. The classic case is a "list of everything" asset: a pawn data asset that maps every weapon to its combo graph. With hard references, loading the pawn loads every weapon's every attack, even though the player can hold one melee weapon at a time.

## When hard is the right call

- The asset is always needed right after its owner loads. The current weapon's montages are needed as soon as the weapon is equipped.
- The set is small and the referenced assets are small.
- Simplicity matters more than memory, for example a prototype with exactly one weapon.

## When soft is the right call

- There are many variants and only one is active at a time: weapons, enemies, bosses.
- The data asset is loaded by something that doesn't need the referenced asset yet.
- The reference chain can drag in large, unrelated assets.
- A server has to load content for several players at once and shouldn't hold all of it.

## Why I went soft before I needed to

When I made this call, PSEUDO had one weapon, a greatsword. By the "when hard is right" list, a hard reference would have been fine that day. I chose soft anyway, for three reasons:

1. **The weapon count is going to grow.** Dual pistols, dual blades, and a second ranged weapon are all in the design. A pawn data asset listing every weapon's combo would keep all of their montages resident all the time.
2. **The game is built as a listen server**, even in single player. The host loads every connected player's content, so unused weapon montages would multiply with player count.
3. **Changing later is expensive.** Going from hard to soft touches the field type, every asset that stores the field (they all need re-saving), and every use site. Going soft now costs one extra load call per weapon change.

The first field to follow the rule was the montage on a combo node:

```cpp
USTRUCT(BlueprintType)
struct FPseudoComboNode
{
    GENERATED_BODY()

    // Soft: loaded when the weapon that owns this graph is equipped.
    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    TSoftObjectPtr<UAnimMontage> Montage;

    UPROPERTY(EditAnywhere, BlueprintReadOnly)
    FName Section;
    // ...
};
```

## Loading rules

Soft references only pay off if something owns the load. Without a rule, every use site ends up calling `LoadSynchronous()` and you've rebuilt hard references with extra steps and a hitch on top. These are the four rules I set:

1. **The owner of the context loads.** Equipping a weapon requests an async load of that weapon's combo montages through `UAssetManager::GetStreamableManager()` and keeps the returned `FStreamableHandle` until the weapon changes. Holding the handle is what keeps the montages in memory; releasing it lets them go.
2. **Use sites call `Get()`.** If it returns null, the use site logs a warning and falls back to `LoadSynchronous()`. A one-frame hitch is better than an attack that silently doesn't play, and the warning tells me a preload is missing.
3. **Networked abilities need the asset on both sides.** A montage played by a predicted ability must be loaded on the server and the owning client before the ability can activate.
4. **`LoadSynchronous()` is never the normal path.** If the warning from rule 2 shows up in a log, that's a bug to fix, not a code path to rely on.

A simplified sketch of rule 1 (the names are illustrative, the engine calls are the real ones):

```cpp
void UMyWeaponComponent::SetCurrentWeapon(const UMyWeaponData* Weapon)
{
    ComboAssetsHandle.Reset(); // release the previous weapon's montages

    TArray<FSoftObjectPath> Paths;
    Weapon->ComboGraph->GatherMontagePaths(Paths);

    ComboAssetsHandle = UAssetManager::GetStreamableManager()
        .RequestAsyncLoad(Paths, FStreamableDelegate());
}
```

## Validation still needs the real asset

There's one place where loading synchronously is the right thing to do: editor-time validation. The combo graph's `IsDataValid` loads each montage and checks that the section names the graph refers to actually exist in it. That only runs in the editor, so the cost doesn't matter, and runtime code never depends on it. A soft reference that points at a renamed section is caught when the asset is saved, not when the player swings.

## What it costs

- A little more code at every use site, and one more thing to remember when the weapon changes.
- In return, memory and load time scale with the active weapon instead of the number of weapons in the game.

The rule covers the data assets that come after it too: weapon data, enemy data, and the anim layer sets once there are more of them. One field still breaks it today: the pawn data's anim layer list holds hard class references. That's fine while there's one playable body, and it's on the list to revisit when the weapon roster grows.

## The short version

Use a hard reference when "loaded with the owner" is exactly when you need the asset. Use a soft reference when the owner gets loaded earlier or more broadly than the asset is used, and decide up front which object owns the load and holds the handle. If the answer to "how many variants will there be" is "more than one, eventually", soft is cheaper to choose now than to migrate to later.
