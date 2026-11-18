---
title: "Predicted Weapon Swap and Auto-Stow in UE5 GAS: One Ability, One Anim Notify, and a Combat Timer"
description: "How I built two-slot weapon swapping in Unreal Engine 5 with a LocalPredicted Gameplay Ability whose slot change happens on the server at an anim notify, then reused it for auto-stowing the weapon out of combat and a draw attack that lives in the combo graph."
date: 2026-11-15
workedOn: 2026-10-20
publishAt: 2026-11-15
track: "Weapon swap and stow"
category: "Build Logs"
sidebar: "Weapon Swap and Auto-Stow"
image: /blog/pseudo-auto-stow-c.jpg
outline: deep
tags: [UE5, GAS, Weapons, Animation, Multiplayer, C++]
---

# Predicted Weapon Swap and Auto-Stow in UE5 GAS: One Ability, One Anim Notify, and a Combat Timer

This is the build log of how PSEUDO's player carries weapons: one melee slot, one ranged slot, a swap key, and a non-combat mode that puts the weapon away once a fight is over. If you're doing the same with the Gameplay Ability System, the short version is: make the swap a locally predicted ability that plays the animation right away, let the server change the slot at a notify inside that animation, and build the stow and the draw out of that same ability and that same notify instead of writing new systems for them.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-auto-stow-c.jpg" alt="The server changes weapon slots at one anim notify; stow and draw reuse it." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-auto-stow-c-dark.jpg" alt="The server changes weapon slots at one anim notify; stow and draw reuse it." loading="lazy">
</figure>

The rules a player sees (which key swaps, what a swap does mid-combo, when the weapon stows) are on the wiki's [Weapons](/wiki/pseudo/systems/weapons) page. This post is about how it was put together.

## Two slots plus a "nothing drawn" state

The character used to have a single stowed weapon. I replaced it with two replicated slots, `MeleeWeapon` and `RangedWeapon`, and a third replicated pointer, `EquippedWeapon`, which is either one of the slots or null.

- `SetEquippedWeapon(W)` files the weapon into the slot that matches its gameplay tag (`Weapon.Melee` or `Weapon.Ranged`) and draws it.
- `SwapWeaponSlot()` runs on the server and draws whichever slot isn't drawn. I kept it a separate function because swap attacks, later on, need the same operation without the ability around it.
- Two mesh components show the result: `WeaponMesh` in the hand, and `StowedWeaponMesh` holding the other slot on its stow socket.
- The pawn data names a default melee and a default ranged weapon, and melee is drawn first.

The null case turned out to matter as much as the slots. With `EquippedWeapon` null both slots are kept and the melee weapon hangs on the back, and the function the animation layers ask (`GetCurrentWeapon()`) returns the tag `Weapon.Stowed`. Anything that picks an animation layer or a combo graph by weapon tag can treat "unarmed" as one more weapon without special-casing it.

## Swapping as a predicted ability with a hand-off marker

The swap is one gameplay ability, `UPseudoGameplayAbility_WeaponSwap`, with the **LocalPredicted** execution policy, so the key press starts the animation on the client without a round trip. It picks its montage from the weapon data assets: the drawn weapon's sheath montage if it has one, otherwise the target weapon's draw montage. Both are soft references on the weapon's data asset.

The moment the weapons change hands is a notify state in that montage, `ANS_PseudoWeaponSwap`, which sends `Event.Weapon.Swap`. When the server's copy of the ability receives that event, it calls `SwapWeaponSlot()`, and the slot change replicates to everyone. The client never changes slots on its own; it only plays the animation early.

Two fallbacks keep a missing asset from leaving the player stuck: no montage swaps at once, and a montage without the notify swaps when the montage ends and logs a warning.

The ability also owns the tag `State.SwappingWeapon`, which blocks the combo, and cancels abilities tagged `Ability.Melee.Combo`. So pressing swap in the middle of a combo, outside a swap window, ends the combo and plays a plain swap. That was a deliberate choice between two behaviours; swapping inside a window continues the combo with a swap attack instead, which the [combo graph](./2026-11-14-pseudo-melee-combo-graph-build) handles.

Ending a predicted ability correctly took a debugging session of its own. If the client's normal end reaches the server, it can cut the server's copy short before it gets to the notify, and the server never swaps. The client now never replicates a normal end, and real interrupts go through `CancelAbility`. The whole story is in [The Server Never Swapped](./2026-10-19-pseudo-predicted-weapon-swap).

## Getting a draw animation out of a sheath clip

I had one usable clip: Kwang's `TravelMode_Start`, retargeted onto the Twinblast skeleton, where the sword goes from the hand to the back. I picked the attach-switch frame at 0.40 s, where the hand grip and the back grip are 6.8 cm and 18° apart, so the jump between sockets is small.

- The sheath montage plays the clip forward with the notify at 0.40 s.
- The draw montage is the **same clip** with the segment play rate set to -1, and the notify at 1.27 s.

One clip, two montages, no new animation work. A small editor trap on the way: the gameplay tag set on the notify's Blueprint defaults didn't reach the notify instances already placed in the montages, so I had to set it on each instance.

Input is one action, `IA_WeaponSwap`, mapped through the input config to `InputTag.Weapon.Swap`. The ability is granted from the pawn data's startup abilities.

## Deciding when a fight is over

Auto-stow needs a definition of "in combat". I made it a replicated loose tag, `State.InCombat`, set on the server by `NotifyCombatEvent`. Two kinds of event count:

- damage dealt or taken, health or shield (the health attribute set reports it for both the owner and the instigator),
- an enemy's AI controller targeting the player.

The AI calls this every tick, so the event itself has to be cheap. It only records `LastCombatEventTime`. The `CombatTimeout` timer (8 s, in world time) is set once when combat starts. When it expires, it checks whether a newer event came in, and if one did it re-arms itself for the remaining time. Combat ends exactly one timeout after the last event, and the timer isn't reset thousands of times a second.

Because the tag replicates, the client sees `State.InCombat` as soon as an enemy targets it, which the next step depends on.

## Auto-stow runs on the machine that has the input

The other half of the rule is "no combat input for a few seconds", and input only exists on the owning machine. So `CheckAutoStow` runs on the local player, on a 0.25 s timer. It asks for a stow when:

- a weapon is drawn,
- none of `State.InCombat`, `State.Attacking` or `State.SwappingWeapon` is present,
- no combat input has arrived for `AutoStowIdleTime` (3 s).

Moving and looking never reset that timer. An earlier version let movement delay the stow, and I changed it so that walking around after a fight still puts the weapon away. Some ability inputs are ignored too, through a settings list, `AutoStowIgnoredInputs`, which defaults to jump and dash. Dash went into the list ahead of the defense work that adds the dash.

The stow itself is `UPseudoGameplayAbility_WeaponStow`, a subclass of the swap ability with a stow-only flag. It plays the drawn weapon's sheath montage, and at the same `Event.Weapon.Swap` notify the server sets `EquippedWeapon` to null, keeping both slots. The ability is blocked by `State.InCombat`, so if the client's view is stale and it asks to stow just as a fight starts again, the server refuses.

Not every stow should animate. `RequestStow(bInstant)` on the server covers the rest: the instant form cancels combo, swap and stow abilities and sets the weapon to null directly. Adding `State.Traversal` (climbing, swimming) triggers it. The animated form is where resting at a camp will hook in once interaction exists.

All three numbers (combat timeout, idle time, ignored inputs) are in project settings under the game's combat section, not in the code.

## The draw attack is one more combo entry

I didn't want a separate "draw" button. An attack press while nothing is drawn should draw the greatsword and swing in one motion.

Every machine mirrors "nothing drawn" as a local loose tag, `Weapon.Stowed`, derived from the replicated `EquippedWeapon` in `UpdateWeaponStateTag`. The tag itself isn't replicated, because every machine can derive it. Combo graph transitions can already require or block tags, so the draw attack is data:

- When stowed, the combo ability uses the **melee slot's** graph.
- The greatsword graph has a new entry transition, `{Light, requires Weapon.Stowed} → Draw_1`.
- The normal `Light_1` entry now blocks `Weapon.Stowed`. Since the two conditions never overlap, the order of the entries no longer matters, even though the graph uses the first matching transition.
- `Draw_1` copies `Light_1`'s transitions, so the second press goes on to `Light_2`.

The draw itself is the same notify again: `Event.Weapon.Swap` inside the draw attack's montage makes the server draw the melee slot, and clients follow by replication.

The montage is a composite. The travel clip plays backwards from 0.5 s to 0 at 1.25× speed (0.4 s, hand from the back grip forward), then the first attack and its recovery. The grab notify sits at 0.08 s, and the hit, perfect and combo windows are `Light_1`'s windows moved 0.4 s later.

## If you're building the same thing

What I'd keep from this, independent of PSEUDO's code:

1. **One server-side moment for the slot change.** Put a notify in the animation and change the replicated slot only when the server's copy of the ability reaches it. The client can play everything early; the state change has a single owner.
2. **Make "unarmed" a weapon tag.** Returning a stowed tag from the current-weapon query lets layers and combo graphs handle it with the data they already have.
3. **Cheap combat events, one timer.** Record a timestamp per event and re-arm a single timer on expiry. Anything that might call the event every tick, AI especially, then costs nothing.
4. **Check idle input where the input is.** Run the stow check on the owning client and let a tag on the ability (blocked by the in-combat tag) let the server reject stale requests.
5. **Decide which inputs count.** Movement, look, jump and dash shouldn't keep a weapon out, or auto-stow never happens.
6. **Make conditional entries mutually exclusive.** A required tag on one entry and the same tag blocked on the other avoids depending on list order.

## How it was tested, and what wasn't

Everything ran in PIE as a listen server with one client, with inputs injected per local player. For the non-combat tests I shortened the timeouts to 4 s and 2 s in memory.

- Sheath and draw from both host and client; the server swapped at its own notify and the other machine played the montage. A swap in mid-combo cancelled the combo and sheathed. After a round trip the full greatsword chain still ran with zero rejections. A server copy interrupted before the notify didn't swap.
- The client saw `State.InCombat` when the enemy minion targeted it. Combat came from damage taken and damage dealt, and ended 4 s after the last event.
- The client, idle out of combat, stowed on both machines. The host never stowed while the minion was hitting it and stowed right after its combat ended.
- Moving every 0.1 s, or jumping every 0.5 s, didn't delay the stow: it started about 2.1 s after the draw both times.
- The draw attack's first press entered `Draw_1`, the server drew the greatsword at the grab notify, the swing hit a dummy, and the second press went on to `Light_2`.
- Swap while stowed drew the weapon; adding the traversal tag (through a test cheat) stowed instantly.

One case stayed untested: a client-side interrupt in real play, because nothing in the game could interrupt a swap yet.

## Still open

- The draw attack is a reversed travel clip glued onto the first attack. A real draw-slash animation is a polish item.
- Camp rest stow waits for interaction.
- The pistols are still part of the body mesh, so they float while the greatsword sheathes. They become separate meshes with the ranged work.
- The stowed animation layer and faster travel movement belong to the melee weapons work.
