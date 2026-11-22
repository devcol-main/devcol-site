---
title: "A Replicated, Saved Inventory on the PlayerState in UE5: Item Data Assets, One GAS Consumable Ability and Pickups That Survive a Load"
description: "How I built the inventory for a UE5 listen-server action RPG: UPrimaryDataAsset item definitions found by gameplay tag, an inventory component on the APlayerState with a plain replicated TArray of stacks, one LocalPredicted consumable ability that reads the item from the event payload, weapon items that do not duplicate the pawn's weapon slots, and two bugs from testing: a spawned pickup whose item never replicated, and a dropped pickup that came back from a save with no item. Plus a unity-build error from DEFINE_LOG_CATEGORY_STATIC."
date: 2026-11-24
workedOn: 2026-10-23
publishAt: 2026-11-24
track: "Inventory core"
category: "Build Logs"
sidebar: "Inventory Core"
image: /blog/pseudo-inventory-ps-c.jpg
outline: deep
tags: [UE5, Inventory, GAS, Multiplayer, Replication, SaveGame, CommonUI]
---

# A Replicated, Saved Inventory on the PlayerState in UE5: Item Data Assets, One GAS Consumable Ability and Pickups That Survive a Load

This build log covers the first inventory in PSEUDO, a UE5 action RPG that always runs as a listen server. It has items as data assets, stacks on the player state, potions used through the ability system, two accessory slots, pickups in the world, a menu screen, and saving. If you are building the same thing, the choices that mattered most were: keep the inventory on the `APlayerState` so it outlives the pawn, keep one source of truth for anything another system already owns (here, the equipped weapons), make one consumable ability that reads its item from data, and remember that a spawned actor's properties need both `Replicated` and `SaveGame` if clients must see them and a save must bring them back. Testing found one bug for each of those last two.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-inventory-ps-c.jpg" alt="Stacks live on the player state; a spawned pickup needed its item replicated and saved." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-inventory-ps-c-dark.jpg" alt="Stacks live on the player state; a spawned pickup needed its item replicated and saved." loading="lazy">
</figure>

## Items are data assets with a gameplay tag as their id

An item is a `UPrimaryDataAsset` (`UPseudoItemDefinition`). The asset manager scans `/Game/Data` for that type, so the game can list every item and look one up by tag through a cached lookup. Each item has:

- an `Item.*` gameplay tag as its id, a name, a description and an icon,
- a category: Consumable, Equipment, Material or Key,
- a `MaxStack` and a mesh for when it lies in the world,
- for consumables, a use effect, a magnitude and whether using it consumes it,
- for equipment, either a weapon definition (a weapon item) or a set of stat bonuses plus an optional effect (an accessory).

Adding a new item is a new data asset and a new tag in the gameplay tag config, with no code. The first set was six items, with three pickups placed in the hub.

## Why the inventory lives on the player state

The inventory component sits on the player state, next to the ability system component and attribute sets, which the game already keeps there so they survive pawn swaps. A death and respawn creates a new pawn but keeps the same player state, and the inventory comes along with nothing to copy.

The component holds three replicated things: the item stacks (tag and count), two accessory slots, and the quick item. All changes happen on the server: `AddItem` (which respects `MaxStack` and returns how many fit), `RemoveItem`, `Equip`, `Unequip`, `UseItem`, `DropItem`, `SetQuickItem`. A client calls `Request*` functions that go through server RPCs. A delegate fires on every machine when the inventory changes, and the UI refreshes from it.

The checks that say whether an item can be used or equipped right now are shared functions. The UI calls them to hide buttons, and the server calls the same ones to refuse a request, so the two cannot disagree.

The stacks are a plain replicated `TArray`, not a fast array serializer. An inventory here has a handful of entries, and replicating the whole array on a change is fine at that size. I noted that it should be revisited if inventories grow past about 50 stacks.

## Weapons stay in the pawn's slots

The pawn already had a melee weapon slot and a ranged weapon slot, and the save system already saved them. If weapon items kept their own "equipped" state too, the two could drift apart, most likely after a load. So weapon items do not store anything: whether a weapon item is equipped is computed by comparing its weapon definition with what is in the pawn's slots. Equipping a weapon item calls the pawn's existing `SetEquippedWeapon`, and a weapon slot is never emptied (only accessories can be unequipped).

The cost is that owning a weapon item and having that weapon in a slot are independent. The default weapons sit in the slots without the matching items in the inventory. I accepted that for one source of truth.

Accessories reuse the stat pipeline from the skill tree. Both slots' stat bonuses are summed into one infinite gameplay effect that is replaced whenever an accessory changes, so derived stats follow automatically (the stat setup is in the [data-driven stats build log](./2026-11-14-pseudo-data-driven-stats-mmc)). An accessory can also carry its own effect, for a regen or status-style bonus. In the test, equipping a ring raised one primary stat from 10 to 15, and unequipping it dropped it back to 10.

## One consumable ability for every item

There is one consumable ability, granted once through the pawn's data. It is `LocalPredicted` and blocked while the character is reacting to a hit or dead. The item comes from data, not from the ability class:

- The quick-use key uses the quick item.
- The menu's Use button asks the server, which sends a gameplay event with the item as the payload and activates the same ability.

Only the server changes state: it consumes the item and applies the item's effect with the magnitude passed as a SetByCaller value. Heals are clamped to the missing health. In the test, a potion at 50 health brought it to 110 out of 150, and a potion at 140 healed only 10.

I made the ability predicted so that a key press can start the drink animation without waiting for the server (there is no drink clip yet). The item count is not predicted: the client's stack shrinks when the replicated array arrives.

The quick item is simply the first consumable picked up, until the player picks another. When its stack runs out, the next consumable takes its place.

## Pickups, drops and the two bugs testing found

A pickup actor implements the game's interact interface and its saveable interface. Interacting adds the item and count; whatever does not fit stays on the ground. Dropping an item from the menu spawns a pickup in front of the player. Key items cannot be dropped.

**Bug one: a client could not see or take a spawned pickup.** Placed pickups worked, because their item is set in the level and loaded on every machine. A pickup spawned at runtime (a drop, or one from a cheat) only had its item set on the server. On the client it had no item, so it was hidden and the interact focus never picked it up. The fix was to make the item property replicated, with the same rep-notify as the taken state. After that, a client took a spawned stack of five scrap and the pickup disappeared on both machines.

**Bug two: a dropped pickup came back from a save with no item.** The save system already records actors spawned at runtime and spawns them again on load (that system is in the [save and checkpoint build log](./2026-11-22-pseudo-save-load-checkpoints-listen-server)). The respawned drop was there, but only properties marked `SaveGame` are written, and the item was not one of them. Marking it `SaveGame` fixed it: drop a potion, save, load, and the potion pickup was back on the server and the client.

The pattern behind both: for an actor spawned at runtime, nothing is in the level to fill in its properties. Every property the client needs must replicate, and every property the save needs must be `SaveGame`.

The inventory itself is saved as its own versioned block in the player part of the save, after the skill tree. Older saves without that block leave the inventory alone. In the test, clearing the inventory and loading brought back three stacks and the worn ring (and its stat bonus), the placed pickup stayed taken, and the client's inventory was restored after it rejoined.

## The menu screen

The inventory screen is a CommonUI activatable widget with the same menu input mode as the settings screen. It has four category tabs, a stack list showing "Name xN" with markers for equipped and quick items, a detail panel, and the actions Use, Equip, Unequip, Quick, Drop and Back. Buttons that would be refused are hidden, using the shared checks above. It opens with I or the pad's View button and closes with I, Esc or B. Both keys are remappable in the controls menu.

## A unity build error from three static log categories

Right after this landed, the editor build failed with `C2011: 'FLogCategoryLogPseudoInventory': 'struct' type redefinition`. Three files each had their own `DEFINE_LOG_CATEGORY_STATIC(LogPseudoInventory, ...)`. A static log category defines a struct in each translation unit. That is fine while the files compile separately, but unity build merges several `.cpp` files into one, and once two of these files ended up in the same unity file, the struct was defined twice. It had built before only because the files happened to land in different unity files.

The fix was to declare the category once with `DECLARE_LOG_CATEGORY_EXTERN` in the game's shared log header and define it once in its `.cpp`. The rule I took from it: a log category used by more than one file is declared in one header, never with `DEFINE_LOG_CATEGORY_STATIC` in several files. Builds that only recompile changed files can hide this for a long time.

## Not done yet

- No use or drink montage, because the project has no clip for it yet.
- No icons: the screen shows text.
- No quick slot bar on the HUD, and the equipment tab inside the pause menu is still its own screen.
- Shops, boss rewards and other sources will call `AddItem` when they exist.
- A third weapon asset is needed to test swapping weapons through items.

## If you are building an inventory for a networked UE5 game

- Put it on the player state if items should survive death and respawn.
- Do not give items a second copy of state another system already owns. Derive it.
- Use one data-driven consumable ability with the item in the event payload instead of an ability per item.
- Share the "can I do this" checks between UI and server.
- For anything spawned at runtime, check that every property clients need is replicated and every property the save needs is `SaveGame`.
- A plain replicated array of stacks is fine for small inventories. Measure before reaching for a fast array.
