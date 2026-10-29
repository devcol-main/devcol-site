---
title: "A Groggy Gauge That Never Filled: When Zero Means Off and the Log Says Nothing"
description: "Changing the player's groggy duration in PSEUDO had no visible effect, and the log had no groggy lines for the player at all. The code was fine: a data asset was missing one value whose default of 0 means 'never groggy', and the function returned before it logged anything."
date: 2026-10-23
publishAt: 2026-11-05
track: "Player groggy never triggers"
outline: deep
tags: [UE5, GAS, Data Assets, Debugging]
---

# A Groggy Gauge That Never Filled: When Zero Means Off and the Log Says Nothing

PSEUDO has a groggy gauge, close to Sekiro's posture: every attack carries a poise value that fills the target's gauge, and a full gauge leaves the target stunned and taking 50 % more damage for a few seconds. (The design is on the [Defense](/wiki/systems/defense) page.) The gauge works on players as well as enemies, so an enemy that keeps landing hits can break you too.

I wanted the player's groggy to be shorter than an enemy's, so I opened the player's pawn data asset and set Reactions → Groggy Duration to 2.0. Then I let a training dummy beat on me in PIE. I took staggers and knockdowns, but I was never groggy, short or long.

This is a short bug, but the way it hid is worth writing down, because the same shape will come back with every new "0 means off" setting.

## The symptom

The test: a listen server with one player, the dummy enemy `BP_PseudoEnemy_Dummy`, attack it, and let it hit back. The reaction system logs to `LogPseudoReaction`, so I filtered `PSEUDO.log` for that.

- **Expected**: the dummy's hits add poise to my gauge, a line like `groggy +X -> Y / Max` for each hit, then `GROGGY for 2.0 s` when the gauge fills, and about two seconds of stun.
- **Observed**: `Stagger` and `Down` reactions for the player, and not a single groggy line for `BP_PseudoPlayerCharacter_C_0`.

The dummy's own groggy lines were there. When I hit the dummy, its gauge filled and it went groggy. So the gauge code worked for enemies, and something was different for the player.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The player's duration edit isn't read | For a player, the reaction component's `GetConfig()` returns the reactions block from the player's pawn data; the duration is passed into the groggy effect as a SetByCaller value | Code path is correct |
| 2 | I edited the wrong asset | Earlier in the session I had in fact edited the dummy's `DA_Enemy_Dummy` by mistake; its groggy lines were the only ones in the log | Explained an earlier confusion, not this one: the player asset now had the duration |
| 3 | The player's gauge never fills because its maximum is 0 | `AddGroggy` returns early when `MaxGroggy <= 0`, before any log line; `MaxGroggy` defaults to 0 in the reactions struct | **Confirmed** |
| 4 | The dummy's hits carry no poise | The same early return also fires when the amount is 0 | Ruled out: the dummy's swings carry 10, 15, 20 and 25 poise |
| 5 | The player is already groggy or stopped, so the gauge is skipped | The early return checks those state tags too | Ruled out: no such tag was on the player |

Hypothesis 2 is worth a sentence. Earlier in the session I really had edited the dummy's asset instead of the player's, and the dummy's groggy lines in the log had muddied the picture. Once the edit was on the player asset, there were still no player lines. That second silence was the real bug.

## The cause

The groggy settings live in one struct shared by enemies and players:

```cpp
// PseudoReactionTypes.h (simplified)
UPROPERTY(EditDefaultsOnly, Category = "Groggy")
float MaxGroggy = 0.f;        // 0 = never groggy

UPROPERTY(EditDefaultsOnly, Category = "Groggy")
float GroggyDuration;
```

And `AddGroggy` starts with the guard you'd expect:

```cpp
// skip if there's no poise, groggy is disabled, or the target is already groggy or stopped
if (Amount <= 0.f || Config.MaxGroggy <= 0.f || bAlreadyGroggyOrStopped) { return; }
// ... add to the gauge, log "groggy +X -> Y / Max", break at Max
```

The dummy's data asset had `MaxGroggy` set to 100. The player's pawn data asset, `DA_PawnData_Default`, had a `GroggyDuration` but had never had `MaxGroggy` set, so it held the struct default of 0. For the player, every call to `AddGroggy` returned on the first line, and the duration I'd been editing was never reached.

Nothing was wrong with the code. A value that means "this feature is off" was off, and the code honored it without a word.

## The fix

`DA_PawnData_Default` → Reactions → Groggy → `MaxGroggy` = 100, the same scale as the dummy. That's a tuning value, not a design number yet. `GroggyDuration` stayed at 2.0. No code change.

## Checking it

Same setup: listen server plus one player on the prototype map, the host at 5000 HP so it could survive long enough, and the dummy's minions doing the hitting.

1. Groggy lines now appear for the player: `groggy +10.0 -> 10.0 / 100`, then +20, +15, +25 and so on.
2. The break: `groggy +10.0 -> 100.0 / 100`, followed by `GROGGY for 2.0 s (damage taken +50 %)`.
3. Two seconds later, `groggy over, gauge reset`, normal hits after that, and a second groggy that also ended after 2.0 s.

The first fill took seven hits in about 7.4 seconds. Hits that land during the 1.5 seconds of reaction immunity after getting up still add to the gauge but only make the player flinch, which is by design: immunity protects you from being stun-locked, not from pressure building up.

One test tool didn't help. The cheat that forces groggy, `PseudoGroggy`, only targets enemies, so I couldn't use it to check the player path. That's a gap I'll close when the cheat set gets its next pass.

## What I took from it

**Silence in the log can be an early return.** I read "no groggy lines" as "the groggy code never ran". It did run, and it returned on its first line. Before concluding that code ignores a setting, check the asset's actual values, all of them, not just the one you edited.

**A default that means "off" should say so when it's hit.** `MaxGroggy = 0` meaning "never groggy" is a reasonable design: some enemies should never be staggered by poise. But a silent return makes the off state look exactly like a broken pipeline. A one-time verbose log line ("groggy disabled for X: MaxGroggy is 0") on that branch costs nothing and would have pointed at the asset in seconds.

**Shared structs need complete assets.** Enemies and the player share the reactions struct, which is the right call, since the server judges both the same way. The cost is that a field only one side cared about at first can sit at its default on the other. Data validation on the pawn data asset (`IsDataValid`) that warns when a groggy duration is set while the maximum is 0 would catch this class of mistake at save time, before PIE.
