---
title: "Stamina and Sprint with GAS"
description: "Building a replicated stamina system on Unreal's Gameplay Ability System: one periodic effect for all rules, client-predicted sprinting through a custom movement flag, exhaustion hysteresis, and two bugs that had been hiding in the project."
date: 2026-10-02
outline: deep
---

# Stamina and Sprint with GAS

Tumble Teams needed stamina: a pool of 100 spent mostly by movement and attacks. Hold Shift to sprint for 3 per second, fall back to walking when it's empty, and recover from items, recovery zones, and standing (+2 per second) or walking (+1 per second). Walking speed is 250, sprint speed is 600.

## The design

**Stamina is a GAS attribute, not a component.** I first proposed a stamina component like the one used for health at the time, but the project already had `Stamina` and `MaxStamina` in its attribute set, and the upcoming abilities (dive attacks and so on) would spend it through gameplay effects. Keeping one pool means no component-versus-GAS duplication, the ability cost check (`CostGameplayEffectClass`) rejects activation when stamina is short, and the UI listens in one place.

**One effect handles every rule.** A single infinite gameplay effect with a 0.1-second period and a `SetByCaller` value (`Data.Stamina.Rate`) covers sprint drain (-3/s), idle recovery (+2/s), walking recovery (+1/s), and recovery zones (+N/s). Callers pass "change per second" and the effect multiplies by the period. The server checks the character's state every 0.1 seconds and swaps the effect only when the rate changes. Recovery zones apply on entry and remove on exit, stacking on top of the base recovery.

**Sprint is predicted, not RPC'd.** If only the server changed `MaxWalkSpeed`, client prediction would disagree and cause rubber-banding. Instead, a `UCharacterMovementComponent` subclass sends a sprint flag in each move's compressed flags (`FLAG_Custom_0`). Server and client compute with the same speed, and no extra RPC is needed. The player character swaps in that component class through `ObjectInitializer.SetDefaultSubobjectClass`, so AI characters are unaffected.

**Exhaustion has hysteresis.** At 0 stamina, sprint locks until stamina climbs back to 10. Without that gap, walking recovery (+1/s) is slower than sprint drain (-3/s), and sprinting would flicker between sprint and walk every tick near zero.

## Bugs that were already in the project

- **Players' ability system had no attribute set.** The character built its own ASC with the attribute set, but the player's `GetAbilitySystemComponent()` returned the one on the **PlayerState**, a plain `UAbilitySystemComponent` with no attribute set. The player never had a Stamina attribute, and the existing dash cost effect probably never worked. I swapped in a PlayerState ASC subclass that registers the attribute set on initialization. After that, dash really costs 25 and can be blocked when you can't afford it, which is a visible behavior change.
- **Stamina changes overwrote Mana.** The stamina branch of `PostGameplayEffectExecute` was calling `SetMana`.
- **Remaining state across respawns.** The PlayerState's ASC outlives the pawn, so stamina and its effects would carry over to a new pawn. `PossessedBy` now resets the attributes and removes leftover stamina effects, ahead of implementing same-round respawns.

## Smaller snags

- **Sprinting while jumping dropped to walking speed.** `GetMaxSpeed` returned the sprint speed only on the ground. In the air the engine used 250 and decelerated from 600. Sprint speed now holds while falling too, with the trade-off that holding Shift in the air keeps draining stamina.
- **A shadowed local variable became an error.** This project treats "declaration hides class member" as an error, so local names must differ from member names.
- **Input assets via headless Python.** `import_text('(KeyName="LeftShift")')` parses as `(` and gives an empty key; use just `LeftShift`. And `map_key` doesn't mark the asset dirty, so a plain save silently skips it. Call `modify()` and force the save, then check `git status`.
- **Blend data that wasn't saved.** The locomotion BlendSpace was playing a frozen pose again because its generated runtime data had never reached disk (the full story is in [the animation post](./2026-10-02-tumble-teams-root-motion-and-blendspace)). Also, calling `reload_packages` while that asset's editor was open crashed the editor.
- **Python can't inject input.** To test sprint without a keyboard, I exposed `SetWantsToSprint`, `GetStamina`, `IsStaminaExhausted` and similar functions as Blueprint-callable, which the UI and AI need anyway.

## How I checked it

In PIE, with tick callbacks sampling over time:

| Check | Result |
|---|---|
| Walk / sprint speed | 250 / 600 |
| Sprint drain | 100 to 0 in 34 s (about 2.94/s) |
| Recovery ratio | idle : walk : sprint = 2 : 1 : -3 |
| Exhaustion | back to walking within 0.3 s of reaching 0, resprint exactly at 10, no flicker |
| Two-player listen server | stamina matches on both, client-to-server gap converges (75 cm peak while moving, 1.5 cm after stopping), no corrections |
| Recovery zone | 2 effects inside, 1 outside, even over repeated enter and exit |
| Sprint in the air | horizontal speed holds at 600 |

One measurement trap: PIE was running at about 3 fps, so timing with Slate's tick `dt` skewed the scale (drain first looked like 7.9 per second). Game time from `get_time_seconds`, or relative ratios, gave the right numbers.

Not verified: actual Shift key presses, the dash cost end to end, and long-run two-player correction. Those need a human at the keyboard.
