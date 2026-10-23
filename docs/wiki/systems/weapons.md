---
title: "Weapons: Two Slots, One Swap Key"
description: "PSEUDO's weapon roster and how weapons are carried: one melee and one ranged slot, a single swap key, ammo, draw time and mana as ranged resources, stat scaling per weapon, separate weapon meshes, and the non-combat mode that stows everything when a fight ends."
publishAt: 2026-10-22
outline: deep
---

# Weapons: Two Slots, One Swap Key

PSEUDO's player carries exactly two weapons: one melee, one ranged. A single key swaps between them, and swapping mid-combo continues the combo instead of starting over. This page covers the roster, what each weapon spends, how weapons are defined in data, and what happens to them when you're not fighting.

Numbers on this page are first values, tuned in data.

## The roster

| Slot | Weapon | Main stat | Status |
|---|---|---|---|
| Melee | **Greatsword** | Strength | In the build |
| Melee | Dual blades | Strength | Planned for after the vertical slice |
| Melee | Axe or spear | Strength | Later |
| Ranged | **Dual pistols** | Dexterity | Defined, attacks come with the ranged work |
| Ranged | Bow *or* magic, one of them | Dexterity / Spirit | Planned; decided after checking which animations exist |

The first playable build is **greatsword + dual pistols**. Each weapon gets its own combo graph and its own skill tree, so adding a weapon means adding data assets, not new combat code.

The stages also decide what you can use. Stage 1 is melee only, Stage 2 is ranged only, and Stage 3 allows both with swapping. The game sets the rules, and the weapon system follows them.

## Two slots and one key

You choose your melee and ranged weapon in the hub or the inventory. In a fight there's one swap key:

| | Gamepad | PC |
|---|---|---|
| Swap weapon | L2 | Tab |

I tried the mouse wheel for swapping and removed it. A wheel scroll is too easy to trigger by accident in the middle of a fight, and the wheel click is needed for lock-on.

On a gamepad L2 is shared with interact. If something you can interact with is in focus and no enemy is nearby, L2 interacts. Otherwise it swaps. There's no picking things up mid-fight.

### What a swap does

- **Out of a combo**: the drawn weapon plays its sheath animation, and the other weapon is drawn. The moment the weapons actually change hands is a marker in the animation, and the server makes the switch at that marker.
- **In a combo, inside a swap window**: you get a swap attack, the other weapon's link move, and the combo keeps going. Swapping back resumes where you left off. The [Combos and Cancels](/wiki/systems/combo-and-cancels) page covers how.
- **In a combo, outside a swap window**: the combo ends and a plain swap plays.

The melee weapon isn't hidden when the pistols are out. It goes on your back, in the grip position taken from the original travel animation.

## Ranged resources

Each ranged weapon spends something different, so they don't play the same:

| Weapon | Resource | Refill | Feel |
|---|---|---|---|
| Dual pistols | Ammo | Basic ammo: 24 rounds, +1 every 0.5 s, also while firing | Fast, runs dry fast |
| Bow | None | — | Each shot costs draw time |
| Magic | Mana | Refills over time | Each spell costs mana |

There's no reload key. A reload button adds a chore without adding a decision, and a steady trickle of rounds already makes you pace your shots. The trickle keeps running while you fire, so holding the trigger never locks you out completely; you just fall back to the regen rate. A perfect dodge refills basic ammo to full, which ties the ranged weapons into the same "play well, get resources" loop as the dice. Special ammo types keep their own stock and don't refill that way. Mana will get the same treatment when magic exists.

Refills run on world time, so they slow down with everything else during slow motion. That keeps slow motion from becoming an infinite ammo window.

## Ranged mode

With the pistols drawn you are always aiming: the character strafes, a crosshair appears, and shots go out from the camera center. That's a different stance from melee, so a few melee rules don't carry over.

- **One fire button.** Left mouse (square on a gamepad) fires the selected ammo type. Holding it is automatic fire; charge types, such as a laser, charge while held and fire on release.
- **E / L1 picks the next ammo type.** On melee that button is guard and parry. In ranged mode there's no guard or parry, and no skill chord on that button either. The cycle includes basic ammo and skips special types that are empty. The mouse wheel or the touchpad cycles too.
- **No lock-on.** Drawing the pistols drops any lock. Holding the lock-on key for 0.2 s opens an **ammo wheel** instead: unlocked types with their stock, empty ones greyed out; you point at one and release to pick it. In single player the world slows to 0.2 while the wheel is open. In multiplayer it doesn't, because slowing time for one player would slow it for everyone.

This is the second version of the ranged controls. The redesign put everything on one trigger and one selector, because the point of the mode is to keep shooting while you move, not to juggle keys.

Each ammo type is a data asset (`UPseudoAmmoType`) that also carries its feedback: crosshair color and shape, the ammo count and icon, a pop-up and pulse on switching, switch and fire sounds, and a tint on the pistols. Muzzle flash and a tracer play from the muzzle sockets on every machine. The hit itself is still traced from the camera, on the server, so what you see in the crosshair is what gets hit.

## Weapons as data

A weapon is a data asset (`DA_Weapon_Greatsword`, `DA_Weapon_DualPistols`) that holds:

| Field | Purpose |
|---|---|
| Weapon tag | `Weapon.Melee.Greatsword`, `Weapon.Ranged.DualPistols`, … |
| Mesh entries | Mesh, hand socket and offset, holster socket and offset |
| Base damage | The first term of the [damage formula](/wiki/systems/damage-formula) (greatsword: 10) |
| Stat scaling | How much Strength, Dexterity and Spirit add (greatsword: Strength 1.0) |
| Default element and gauge | The element a hit carries unless an attack overrides it (greatsword: Physical) |
| Combo graph, draw and sheath animations | Loaded when the weapon is equipped |

Heavy assets like animations, effects and sounds are referenced softly and loaded on equip, so a weapon you don't have doesn't sit in memory.

The weapon tag drives a lot: which combo graph runs, which animation layer the character uses, and which skill tree applies. Early on the greatsword was tagged `Weapon.Melee.Sword`. I renamed it to `Greatsword` before the combo work grew, with a tag redirect so existing assets kept working, because a vague tag gets more expensive to rename with every system that reads it.

### One mesh per weapon

Every weapon is a separate mesh. That sounds obvious, but the character model I'm using has its pistols baked into the body mesh, and the greatsword came out of another character's mesh. The greatsword was extracted into its own static mesh with sockets at the base and tip of the blade. Hit detection sweeps four points along the line between them every frame of a swing. The pistols will be split into left and right meshes in the ranged work, which also gives them a muzzle socket.

Until then the pistols float in an odd place during the greatsword's sheath animation. I decided not to hide them with a temporary fix, because the real fix is already scheduled and a temporary one would have to be undone.

## Elements and stats

- **Elements**: each weapon has a default element, and any single attack can override it. A skill tree upgrade or a dice roll can also put an element on the weapon for a while. When several sources compete, the order is skill-tree augment, then dice, then the weapon's own element. See [Elements and Reactions](/wiki/systems/elements).
- **Stats**: each weapon scales with one main stat (Strength for melee, Dexterity for guns and bows, Spirit for magic), and an individual attack can use different coefficients. See [Stats and Level](/wiki/systems/stats-and-level).

## Non-combat mode

When the fight is over, the weapon goes away. Nothing drawn means faster travel movement and a calmer camera.

| Trigger | When | How |
|---|---|---|
| Auto | No damage dealt or taken and no enemy targeting you for a while, **and** no combat input for a few seconds | Sheath animation |
| Traversal | Climbing a ladder or rope, swimming | Instant |
| Camp | Resting at a camp | Animation |

Movement doesn't count as combat input. Walking, looking around, jumping and dashing don't keep the weapon out, so wandering after a fight still stows it. In the current build combat ends 8 seconds after the last event, and the weapon stows after 3 more seconds without a combat input.

Getting the weapon back out has no separate button. **An attack press while stowed is a draw attack**: the draw and the first swing are one motion. It's an entry in the greatsword's combo graph that only matches while nothing is drawn, and its animation carries the same swap marker as a swap attack. The swap key also draws the melee weapon. Nothing draws automatically when an enemy spots you; I want drawing to be the player's decision.

## Status

The weapon data assets, the greatsword mesh, the two slots, the swap ability and the stowed weapon on the back are in the build and tested with a host and a client. Auto stow and the draw attack are implemented and tested on a branch that isn't merged yet. Ranged mode (one fire button, ammo cycling, the ammo wheel, regen while firing, the perfect-dodge refill and the muzzle effects) was built on 2026-10-22. The pistol meshes are still part of the body mesh, so the pistol tint waits for the mesh split.

Updated 2026-10-24: added the ranged mode section (always aiming, one fire button, ammo type cycling and the ammo wheel, no lock-on with pistols) and the current ammo numbers; a perfect dodge now refills basic ammo to full.
