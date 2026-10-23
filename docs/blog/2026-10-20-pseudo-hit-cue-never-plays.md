---
title: "The Hit Cue That Was Never Registered: GameplayCueName and a Blueprint Child"
description: "In PSEUDO, the melee hit cue was routed by the Gameplay Ability System but never ran on any machine. A Blueprint cue notify inherited its tag from a native parent, the engine's tag derivation left its GameplayCueName empty, and the cue manager never registered it. Here's how I found it and the small override that fixed it."
date: 2026-10-20
publishAt: 2026-10-30
track: "Hit cue never plays"
outline: deep
tags: [UE5, GAS, Gameplay Cues, Debugging]
---

# The Hit Cue That Was Never Registered: GameplayCueName and a Blueprint Child

Every melee hit in PSEUDO fires a Gameplay Cue, `GameplayCue.Hit.Melee`. The cue is where the feel lives: a short hitstop on the victim, and, while I'm still building things, a debug sphere at the impact point and a `LogPseudoHit` line. The server's damage effect triggers the cue, and during the lock-on and feel work I added a second, predicted cue on the attacker's own machine so the hit feels instant even with latency.

While testing that predicted cue, I noticed there were no `LogPseudoHit` lines at all. Not from the new local cue, and not from the server's cue either. The hits did damage. They just didn't look or feel like anything.

## Symptom

- Hitting the training dummy with the greatsword in PIE, in any net mode: damage applied, no debug sphere, no victim hitstop, no log line.
- The same on the host and on a client.
- `GameplayCue.PrintGameplayCueNotifyMap` printed `GameplayCue.Hit.Melee -> index not found`.

That last line turned out to be the whole story, but I didn't run it first.

## What I checked

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The skip rule I had just added to the notify's `OnExecute` returns early | The skip path logs too, and there was no log at all | Ruled out |
| 2 | Cues are suppressed or never routed | `AbilitySystem.DisplayGameplayCues 1`, then executed the cue on an actor from Python with `GameplayCueFunctionLibrary.execute_gameplay_cue_on_actor`. The cue manager printed `GameplayCue.Hit.Melee - Executed` | Ruled out: routing works |
| 3 | The notify isn't in the runtime cue set | `GameplayCue.PrintGameplayCueNotifyMap` → `index not found`; `GameplayCue.PrintLoadedGameplayCueNotifyClasses` → 0 classes | **Confirmed** |
| 4 | The notify's asset registry tag is missing | Read the asset registry data for `GCN_Hit_Melee`: `GameplayCueName` = None | **Confirmed** |
| 5 | Why it's None | Read `UAbilitySystemGlobals::DeriveGameplayCueTagFromClass` and `DeriveGameplayCueTagFromAssetName` in the engine source | Root cause |

The second check was the turning point. The manager said it executed the cue, so the problem wasn't upstream (the effect, the tag, the routing). It was the last step: finding a notify to run for that tag. There wasn't one.

## How the cue manager finds a notify

It helps to know that the Gameplay Cue manager doesn't load every notify class and ask it for its tag. It scans the cue paths through the **asset registry** and reads an asset registry tag called `GameplayCueName` on each notify asset. That's how it builds the tag-to-notify map without loading anything. If an asset's `GameplayCueName` is empty, that asset doesn't exist as far as the cue system is concerned. Executing its tag is a silent no-op: no warning, no error, the manager just has nothing to call.

## Root cause

My setup was a native base class, `UPseudoGameplayCueNotify_Hit`, which sets `GameplayCueTag` to `GameplayCue.Hit.Melee` in its constructor, and a Blueprint child, `GCN_Hit_Melee`, that adds the visual tuning. The Blueprint doesn't set a tag of its own; it inherits the parent's.

`UGameplayCueNotify_Static` calls `DeriveGameplayCueTagFromClass` from `PostInitProperties` and `Serialize`. That function has a rule for exactly this case: if the parent's CDO has a valid tag and the child's tag equals it, the engine assumes the child didn't really choose a tag. It clears the child's tag and tries to derive one from the asset name instead.

The asset name `GCN_Hit_Melee` derives to `GameplayCue.GCN.Hit.Melee`, which isn't a registered tag. So the derivation fails, and the tag is restored from the parent. But by then `GameplayCueName`, the name that ends up in the asset registry, had already been set from the invalid derived tag. That came out as None.

So the object in memory had the right tag, and the asset on disk advertised no tag at all. The manager reads the advertisement.

This bug was older than the feature I was testing. The hit pipeline had been checked on both machines when it was first built, and nobody, meaning me, had re-run that check since.

## The fix

The native class puts the name back after the engine's derivation has run:

```cpp
void UPseudoGameplayCueNotify_Hit::PostInitProperties()
{
	Super::PostInitProperties();
	RestoreGameplayCueName();
}

void UPseudoGameplayCueNotify_Hit::Serialize(FArchive& Ar)
{
	Super::Serialize(Ar);
	RestoreGameplayCueName();
}

void UPseudoGameplayCueNotify_Hit::RestoreGameplayCueName()
{
	// The engine's tag derivation can leave GameplayCueName at None for a
	// Blueprint child that inherits our tag; the cue manager reads this name
	// from the asset registry, so keep it in sync with the tag.
	GameplayCueName = GameplayCueTag.GetTagName();
}
```

Then I re-saved `GCN_Hit_Melee` so the asset registry tag was written as `GameplayCue.Hit.Melee`, and restarted the editor. The restart matters: the runtime cue library is built when the editor starts, so re-saving alone doesn't change what the running manager knows.

The other way out is to name the asset so the derivation succeeds. `GC_Hit_Melee` derives to `GameplayCue.Hit.Melee`, which is the real tag. I kept the override because it doesn't depend on a naming convention that nothing enforces, and any future Blueprint child of this class gets the fix for free.

## Verification

After the restart:

- `LogPseudoHit` on every hit, with the debug sphere and the victim hitstop.
- Listen server with one client: the attacker plays one predicted cue locally, and the other machine plays one cue from the server. No doubles, no misses.
- `GameplayCue.PrintGameplayCueNotifyMap` lists `GameplayCue.Hit.Melee` with an index.

## What I took from it

**`PrintGameplayCueNotifyMap` is the first check, not the last.** Any `index not found` means the notify isn't registered, and no amount of debugging inside the notify will help. I've added it to my cue checklist alongside `DisplayGameplayCues`.

**Separate "routed" from "handled".** Executing the cue by hand and seeing the manager say `Executed` split the problem in two in one step. Everything before the manager worked; the manager had nothing to hand the cue to.

**A Blueprint child of a native cue notify that sets its tag in C++ needs care.** Either restore `GameplayCueName`, or give the asset a name that derives the same tag.

**Log the thing you depend on at a level you'll see.** The cue's execution log was at `Verbose`, which is why its absence went unnoticed for so long. It's at `Log` now. A feature that only shows up in feel, like hitstop, is easy to lose without noticing, because "the hits feel a bit flat today" doesn't sound like a bug.
