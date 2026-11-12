---
title: "Data-Driven RPG Stats in UE5 GAS: Curve Tables, Modifier Magnitude Calculations and One Infinite Effect"
description: "How PSEUDO derives max health, crit and damage bonuses from primary stats in Unreal Engine 5's Gameplay Ability System: CSV data tables and a curve table with a soft cap, a GameInstance subsystem that reads them, five ModMagnitudeCalculation classes on one native infinite gameplay effect, and re-applying it when the pawn changes."
date: 2026-11-14
workedOn: 2026-10-19
publishAt: 2026-11-14
track: "Stats and data"
category: "Build Logs"
sidebar: "Data-Driven Stats"
image: /blog/pseudo-stats-mmc-c.jpg
outline: deep
tags: [UE5, GAS, Data, Combat]
---

# Data-Driven RPG Stats in UE5 GAS: Curve Tables, Modifier Magnitude Calculations and One Infinite Effect

PSEUDO has the usual RPG split: primary stats you raise (Strength, Dexterity, Vitality, Spirit, Luck) and derived stats the game uses (max health, crit chance, crit damage, melee and ranged damage bonuses). This build log shows how I wired that in UE5's Gameplay Ability System so the numbers live in CSV files and a curve table, the mapping lives in a few small C++ classes, and a change to a primary stat updates its derived stats live on server and client. If you're setting up the same thing: put the curves in a curve table, compute each derived stat with a `UGameplayModMagnitudeCalculation`, apply them all as one infinite effect, and re-apply it whenever the pawn changes.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-stats-mmc-c.jpg" alt="Primary stats feed derived stats through curve lookups inside one infinite effect." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-stats-mmc-c-dark.jpg" alt="Primary stats feed derived stats through curve lookups inside one infinite effect." loading="lazy">
</figure>

The rules themselves, what each stat does and why, are on the wiki's [Stats and Level](/wiki/pseudo/systems/stats-and-level) and [Damage Formula](/wiki/pseudo/systems/damage-formula) pages. This post is about the plumbing.

## Attribute sets

Two attribute sets carry the new values. A primary set holds Strength, Dexterity, Vitality and Spirit; Luck already had its own set because the dice use it. The combat set gained `CritDamage` (default 1.5) and two bonuses, `MeleeDamageBonus` and `RangedDamageBonus`. The bonuses are fractions, so 0.1 means +10 %. I'd planned to name them `...Pct` and changed it once it was clear they weren't percentages.

## Where the numbers live

All tuning numbers are CSV files kept in the repo and imported as assets:

- **`DT_PlayerBaseStats`**: one row per player setup with the primaries and the base max health, defense, crit chance and crit damage.
- **`DT_EnemyStats`**: one row per enemy type. The training dummy has 100 HP and 20 defense.
- **`CT_StatScaling`**: a curve table where X is the primary stat and Y is what it adds. For example `VIT_MaxHealth` goes 0 / 500 / 750 at 0 / 100 / 200 Vitality, and `DEX_CritChance` goes 0 / 0.25 / 0.35. Every curve is linear with its slope halved after 100, which is a soft cap you can see in the data.

A project settings class (Project Settings → Game) holds soft references to the three tables plus global constants like the armor constant and the max crit chance, saved in `DefaultGame.ini`.

A GameInstance subsystem loads the tables from those settings, validates value ranges on startup (warnings only) and answers lookups: base stats for a row, enemy stats for a row, and a curve evaluation for a stat. It doesn't copy rows. A lookup always reads the table asset, so a CSV reimport shows up on the next lookup; values set at spawn change on the next play session.

## One infinite effect, five calculations

Each derived stat is the table's base value plus a curve of one primary stat. In GAS that's an `Additive` modifier on the derived attribute whose magnitude comes from a custom calculation class ([`UGameplayModMagnitudeCalculation`](https://dev.epicgames.com/documentation/unreal-engine/API/Plugins/GameplayAbilities/UGameplayModMagnitudeCalculation)). There are five of them, one per mapping: Vitality to max health, Strength to melee bonus, Dexterity to crit chance, Dexterity to ranged bonus, Luck to crit damage. Each one captures its primary stat from the target and evaluates the matching curve from `CT_StatScaling`.

All five modifiers sit on one infinite gameplay effect. I built the effect in C++ rather than as a Blueprint asset:

```cpp
UPseudoGameplayEffect_DerivedStats::UPseudoGameplayEffect_DerivedStats()
{
	DurationPolicy = EGameplayEffectDurationType::Infinite;

	// Each derived value = table base (attribute base value) + curve(primary)
	auto AddDerived = [this](const FGameplayAttribute& Attribute, TSubclassOf<UGameplayModMagnitudeCalculation> Calculation)
	{
		FCustomCalculationBasedFloat Custom;
		Custom.CalculationClassMagnitude = Calculation;

		FGameplayModifierInfo Modifier;
		Modifier.Attribute = Attribute;
		Modifier.ModifierOp = EGameplayModOp::Additive;
		Modifier.ModifierMagnitude = FGameplayEffectModifierMagnitude(Custom);
		Modifiers.Add(Modifier);
	};

	AddDerived(UPseudoHealthSet::GetMaxHealthAttribute(), UPseudoMMC_VitalityToMaxHealth::StaticClass());
	AddDerived(UPseudoCombatSet::GetMeleeDamageBonusAttribute(), UPseudoMMC_StrengthToMeleeDamageBonus::StaticClass());
	AddDerived(UPseudoCombatSet::GetCritChanceAttribute(), UPseudoMMC_DexterityToCritChance::StaticClass());
	AddDerived(UPseudoCombatSet::GetRangedDamageBonusAttribute(), UPseudoMMC_DexterityToRangedDamageBonus::StaticClass());
	AddDerived(UPseudoCombatSet::GetCritDamageAttribute(), UPseudoMMC_LuckToCritDamage::StaticClass());
}
```

My reason was practical: I set up assets with editor Python, and Python can't edit a gameplay effect's modifiers. With the effect in code, the mapping (which stat feeds which attribute) is code and reviewed as code, while the numbers stay in the curve table where a designer would change them. The pawn data still holds the effect class, so a Blueprint subclass could replace it later.

The primary stat is captured **without a snapshot**. That means GAS recalculates the modifier when the primary changes, so raising Strength updates the melee bonus right away without re-applying anything.

## Initialization, and a player state that outlives the pawn

The ability system lives on the player state, which survives when the pawn dies or is replaced. On possess the server runs one function: set base values from the table row, **remove and re-apply** the derived-stats effect, then set health to the new max. Without the remove step, a second possess would stack a second copy of the effect.

Enemies keep their ability system on the pawn, so they just set base values from their stats row when they spawn. This replaced an earlier per-enemy initialization effect.

## The damage formula, with stats

With the stats in place the melee damage execution became:

```text
Base x StatScaling x Multiplier x (1 + Perfect + MeleeDamageBonus)
     x Crit(min(CritChance, MaxCritChance), x CritDamage) x k / (k + Defense)
```

`StatScaling` is `1 + Σ coefficient × primary / 100`. The coefficients come from the weapon (the greatsword scales 1.0 with Strength), or from an attack node that overrides them, and they reach the execution as SetByCaller values. `k` is the armor constant from project settings, 100 by default. The [hit detection build log](./2026-11-14-pseudo-melee-hit-detection-build) covers how the damage effect is applied.

## Testing it without a UI

Two cheat commands did the testing: one sets a stat's base value by attribute name on the server, the other logs the player's and enemies' stats as the local machine sees them. A trap I hit with them: from an editor script, cheats have to run on the **server world's** player controller, because a client controller's server RPC from a script goes nowhere.

On a listen server with one client, the stats matched the curves on both machines (150 HP, 0.075 crit chance, 0.10 melee bonus, dummy defense 20). The client's five-hit chain dealt 10.08, then 11.00 and 11.92 on perfect hits. Setting Strength 30 and Vitality 20 gave 200 max health and a 0.30 melee bonus on both machines. Dropping the armor constant to 20 brought a hit to 8.45, and raising the dummy's defense to 50 in the CSV and reimporting gave 8.07 in the next session.

## What I'd point out to someone copying this

- Keep the mapping in code and the numbers in data. Five tiny calculation classes are easy to read; a curve per stat is easy to tune.
- Don't snapshot primaries you want live.
- If your ability system outlives the pawn, re-applying an infinite effect on possess needs a remove first.
- Don't cache table rows if you want a reimport to show up without restarting.
