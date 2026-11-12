---
title: "The Pistols That Wouldn't Fire: A Bug I Couldn't Reproduce and the Auto-Stow It Pointed To"
description: "Empty the pistols, swap to the greatsword, wait for the ammo to refill, switch back: the gun doesn't fire. Two PIE runs couldn't make the pistols fail. They showed something else: the greatsword stows itself while you wait, and one swap from stowed brings the greatsword back, not the pistols."
date: 2026-11-05
workedOn: 2026-11-03
publishAt: 2026-11-05
track: "Pistols don't fire after a swap"
category: "Debugging / Input & GAS"
sidebar: "Pistols Won't Fire After a Swap"
outline: deep
tags: [UE5, GAS, Input, Weapons, Debugging]
---

# The Pistols That Wouldn't Fire: A Bug I Couldn't Reproduce and the Auto-Stow It Pointed To

PSEUDO's player carries a greatsword and dual pistols and swaps between them with one key (the [Weapons](/wiki/pseudo/systems/weapons) page has the details). The pistols' basic ammo refills on its own over time. So a natural thing to do is: shoot the basic ammo dry, swap to the greatsword, wait for the ammo to come back, then swap back and keep shooting.

That's what I did while playing, and when I switched back, left click didn't shoot.

This post is about a bug that, as far as I can tell, wasn't a bug in the firing code at all. I couldn't reproduce a fire failure. What the attempts showed instead was a rule about drawing weapons that does something reasonable but not what a player expects.

## The symptom

- **Observed**: after the wait, switching back and pressing LMB doesn't shoot.
- **Expected**: the pistols come out and fire. The basic ammo had refilled during the wait.
- **Repro attempt**: `L_Test_Combat`, PIE listen server plus one client, enemies frozen, `PseudoEquip Weapon.Ranged.DualPistols`, drain the basic ammo with taps and a held trigger, `IA_WeaponSwap` to the greatsword, wait 6-7 seconds, swap back, fire.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The fire ability stays active: a dry-fire montage interrupted by the swap never ends it | In code, `PlayDryFire` binds `OnInterrupted` and `OnCancelled` to `EndAbility`. In PIE, I swapped while holding LMB on an empty gun (dry fire running) with `LogAbilitySystem Verbose` on | Ruled out: every `RangedFire` activation ended, and later presses activated |
| 2 | Basic ammo stops regenerating while the greatsword is drawn | `PseudoLogStats` during the wait | Ruled out: ammo went 0 → 6 during the wait. The regen effect lives on the player state's ability system component, not on the weapon |
| 3 | The ranged stance gate blocks basic fire | Code: basic ammo has no stance. PIE: presses after the swap | Ruled out |
| 4 | Client prediction, or the server rejecting the fire after the swap | Client run: swap keys confirmed, and `[server] shot 0 ... ammo 5` after swapping back | Ruled out |
| 5 | The greatsword auto-stows during the wait, and a swap from stowed draws the greatsword | With the real `AutoStowIdleTime`: the greatsword stowed about 5 s after it was drawn. The first `IA_WeaponSwap` logged `None -> DA_Weapon_Greatsword`, a second press `DA_Weapon_Greatsword -> DA_Weapon_DualPistols` | **Likely**: matches "wait about the regen time, switch back, no gun" |

Every time the pistols were actually drawn again, every press fired. Host and client both.

### The first run missed it

My first repro run had `AutoStowIdleTime` forced to 1000 seconds. I'd done that so the weapon wouldn't stow in the middle of other tests. It also meant the one thing that changes during a wait could never happen. The run passed, and it told me nothing. The second run used the real value, and the stow showed up in the log right where the report's "wait" was.

## The likely cause

Two features meet here.

**Auto-stow.** When you stop fighting, PSEUDO puts your weapon away by itself after a few seconds without a combat input. Walking and looking around don't count as combat input. Waiting for ammo to refill is exactly that kind of idle time, so the greatsword went onto the back.

**Swap from stowed.** `UPseudoGameplayAbility_WeaponSwap`, when nothing is drawn, draws the **last drawn** weapon. After "pistols → greatsword → auto-stow", the last drawn weapon is the greatsword.

So from the player's side: you swap expecting the pistols, the greatsword comes out instead, and left click swings it (or, with nothing drawn, does the greatsword's draw attack). If you're expecting a shot, "a sword swing instead" reads as "the gun doesn't fire".

I'm calling this "likely" rather than "confirmed" because I never saw the original failure happen. The sequence fits the report and nothing else I tested did.

## Not a code fix

Nothing here is broken in the sense of code doing something other than what it was written to do. Changing what a swap from stowed draws is a design decision, so I wrote down the options instead of picking one on the spot:

- **A.** A swap from stowed draws the **other** slot from the one that was auto-stowed, so the swap key always alternates.
- **B.** Keep "last drawn", but show on the HUD which weapon the next swap will draw.
- **C.** Separate keys per slot: 1 for the pistols, 2 for the greatsword.

## What I decided

The next day I settled it, and it went in as its own change. None of A-C exactly:

- After a stow, auto or manual, drawing brings out the **last drawn** weapon. If nothing has been drawn yet, it's the melee slot.
- While stowed, an attack input **only draws** that weapon. It doesn't attack. That covers light (LMB), heavy (RMB) and guard (E / L1). The pistols fire everything from LMB and RMB, so those three are enough.
- Dice rolls still work while stowed.
- The greatsword's draw attack is no longer reachable. Its entries in the combo graph are still there, so I can turn it back on from a settings list if I miss it.

To be clear about what that changes: in the exact sequence from the report, one swap press still brings out the greatsword. What's gone is the surprise. Pressing fire on a stowed character now visibly draws a weapon and does nothing else, so you see which weapon you got before anything swings.

On the code side, the server records `LastDrawnWeapon` whenever something is drawn and replicates it to the owner only, since the owner predicts the draw. The swap ability asks one function, `GetDrawTargetWeapon()`, which weapon to draw: the other slot when something is drawn (the old rule), and the last drawn weapon when stowed. An attack press while stowed is turned into a tap of the swap input and the attack itself is dropped.

## Checking it

Listen server plus one client, with the real auto-stow time:

| Test | Host | Client | Evidence |
|---|---|---|---|
| Start (both slots filled, nothing drawn yet), LMB | PASS | PASS | `activate None -> DA_Weapon_Greatsword`, 0 melee combo activations |
| Pistols → auto-stow → LMB / RMB / E / swap key | PASS | PASS | `activate None -> DA_Weapon_DualPistols` each time, 0 fire activations, ammo unchanged |
| Greatsword → stow → LMB | PASS | PASS | greatsword drawn, 0 melee combo activations |
| Dice roll while stowed | PASS | PASS | rolled and ended |
| Server rejections | 0 | 0 | same weapon on client and server for every draw and stow |

A related report from the next day, presses getting lost right after switching ammo types, did turn out to be real bugs in the fire path. That one has [its own write-up](./2026-11-04-pseudo-ammo-switch-lost-presses).

## What I took from it

**If the report has a wait in it, the repro needs the real timers.** I had turned auto-stow off for convenience in my test setup and forgot that a wait is precisely when it kicks in. The first run was a clean pass that proved nothing.

**"Can't reproduce" is a result, not the end.** The failure didn't show up, but the logs from the attempt (`None -> DA_Weapon_Greatsword` where I expected the pistols) were the answer. Reading what actually happened in a passing run was more useful than retrying until it failed.

**Some bugs are two reasonable rules meeting.** Auto-stow is right. "Draw the last weapon" is right. Together, with a wait in between, they hand you the wrong weapon. When neither rule is wrong, the fix is a design call, and I'd rather decide it explicitly than patch one side quietly.
