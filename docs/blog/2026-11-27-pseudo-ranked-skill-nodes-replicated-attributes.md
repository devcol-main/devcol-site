---
title: "Ranked Passive Skills in UE5 GAS: One Replicated Attribute per Bonus and a Per-Rank SetByCaller Magnitude"
description: "How I added four ranked passive skills to a UE5 Gameplay Ability System skill tree without branching on node ids: each node applies an infinite gameplay effect that adds a SetByCaller magnitude, read from a per-rank array on the node, to its own replicated attribute. Covers additive vs multiplicative speed stacking, a damage buff applied in the same frame as the attack that earns it, respec, and what world time does to a buff's duration."
date: 2026-11-27
workedOn: 2026-11-01
publishAt: 2026-11-27
track: "Skill tree"
category: "Build Logs"
sidebar: "Ranked Passive Skill Nodes"
image: /blog/pseudo-skill-ranks-c.jpg
outline: deep
tags: [UE5, GAS, Skill Tree, Attributes, Multiplayer]
---

# Ranked Passive Skills in UE5 GAS: One Replicated Attribute per Bonus and a Per-Rank SetByCaller Magnitude

PSEUDO has a perfect dodge that starts a short slow motion called Glitch Time. I added four passive skill nodes that improve it, three ranks each: a wider perfect-dodge window, a longer Glitch Time, faster movement during it, and a damage buff for the attack that ends it. The pattern applies to any ranked passive in a Gameplay Ability System project. Give each bonus its own replicated attribute with a base of 0. The node applies an infinite gameplay effect that adds a SetByCaller magnitude to that attribute, and the magnitude for each rank sits in an array on the node. Code that needs the value reads the attribute; it never looks at which node is learned. An unlearned node leaves the attribute at 0, which is the old behaviour.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-skill-ranks-c.jpg" alt="Each skill rank adds a SetByCaller magnitude to its own replicated attribute." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-skill-ranks-c-dark.jpg" alt="Each skill rank adds a SetByCaller magnitude to its own replicated attribute." loading="lazy">
</figure>

How the skill tree itself works (trees as data assets, node types, learning on the server, saving by tag) is in [A Server-Validated Skill Tree in UE5 GAS](./2026-11-16-pseudo-skill-tree-progression-gas), and the player-facing rules are on the [Skill Tree](/wiki/pseudo/systems/skill-tree) wiki page. Glitch Time itself is in [Perfect-Dodge Slow Motion in UE5 GAS](./2026-11-25-pseudo-glitch-time-perfect-dodge-slow-motion).

## The four nodes

All four went into the Common tree, which already held survival and mobility, in a new middle column. Each rank costs 1 skill point.

| Node | Per rank | Unlearned → rank 3 | Requires |
|---|---|---|---|
| Perfect Dodge+ | perfect-dodge window +0.05 s | 0.12 → 0.27 s | — (level 1) |
| Glitch Time+ | Glitch Time +0.5 s (real time) | 2.0 → 3.5 s | Perfect Dodge+ (level 1) |
| Glitch Stride | move speed during Glitch Time +15 % | +50 % → +95 % | Glitch Time+ (level 2) |
| Glitch Release | an attack that ends Glitch Time gives +20 / 35 / 50 % damage for 3 s | +50 % | Glitch Time+ (level 3) |

## Where a skill's value should live

The tree already had a pattern for nodes that a component reads directly: the pet drone and scan features ask the skill tree component for a node's rank. I didn't use it here. Four new attributes went onto the combat attribute set instead: `PerfectDodgeWindowBonus`, `GlitchTimeDurationBonus`, `GlitchTimeSpeedBonus` and `GlitchReleaseAttackBonus`. All are replicated, clamped at 0 or above, and 0 by default.

Attributes replicate to the owning client, so server and client read the same number without any extra code. The defense component, which owns the perfect dodge and Glitch Time, only reads attributes and does not need to know the skill tree exists. Anything else that grants the same bonus later, such as an item, can use the same attribute.

Each node points at its own gameplay effect class. They all share one small abstract base, an infinite effect that adds the SetByCaller value `SetByCaller.Skill.Magnitude` to one attribute. Each subclass picks the attribute, so a new bonus node is a one-line subclass plus data.

## Per-rank values as an array on the node

The tree's design document said rank values would come from curve tables. I put them on the node instead: a new field, `EffectMagnitudeByRank`, with one value per rank. When the server applies a node at a given rank, it reads the value and sets the SetByCaller magnitude on the spec:

```cpp
// PseudoSkillTreeComponent.cpp, ApplyNode: per-rank value from the tree
FGameplayEffectSpecHandle Spec = ASC->MakeOutgoingSpec(Node.Effect, static_cast<float>(Rank), ASC->MakeEffectContext());
if (!Node.EffectMagnitudeByRank.IsEmpty())
{
	const float Magnitude = Node.EffectMagnitudeByRank[FMath::Clamp(Rank, 1, Node.EffectMagnitudeByRank.Num()) - 1];
	Spec.Data->SetSetByCallerMagnitude(PseudoGameplayTags::SetByCaller_Skill_Magnitude, Magnitude);
}
NodeEffects.Add(Node.NodeId, ASC->ApplyGameplayEffectSpecToSelf(*Spec.Data.Get()));
```

The values for each rank stay editable in the tree's data asset next to the cost, max rank, prerequisites and position. Data validation checks that a node with an array also has an effect and exactly one value per rank. Respec already removed every effect in `NodeEffects`, so the attributes drop back to 0 with no new code.

## Reading the bonuses in the defense component

Three getters on the defense component combine the base setting, the skill attribute and any other bonus. They are public and Blueprint-pure, and they read only replicated values:

```cpp
// settings base + skill attribute (0 unranked) + Luck
float UPseudoDefenseComponent::GetPerfectDodgeWindow() const
{
	const UPseudoCombatSettings* Settings = GetDefault<UPseudoCombatSettings>();
	return Settings->PerfectDodgeTime + GetSkillBonus(UPseudoCombatSet::GetPerfectDodgeWindowBonusAttribute())
		+ PseudoDice::LuckPerfectFactor(GetASC()) * Settings->PerfectDodgeLuckBonusMax;
}
```

The perfect dodge is judged only on the server, from the dash time the client reports (the [backward perfect dodge post](./2026-11-26-pseudo-backward-perfect-dodge-dash-start-check) shows that check). There is no client-side prediction of it. Because the getter reads only replicated inputs, a UI element or a future client prediction gets the same value the server uses.

Glitch Time does not run in multiplayer at all, so the duration, speed and release nodes do nothing there. The perfect window node works in both.

## Additive speed, and when the damage buff arrives

**Speed stacking.** Glitch Time already gives +50 % move speed by adding to the same `MoveSpeedMultiplier` term that sprint and the dice speed buff use. Glitch Stride adds to that same term: `1 + 0.5 + 0.15 × rank`, so rank 3 is ×1.95. Multiplying instead would have given 1.5 × 1.45 = ×2.175, and the result would depend on the order other modifiers are applied in.

**The release buff.** When an attack ability activates during Glitch Time, the defense component ends Glitch Time. If `GlitchReleaseAttackBonus` is above 0, it then applies a 3-second effect that adds the bonus to the melee and ranged damage bonus terms, the same additive term the dice attack buff uses, and adds a `State.GlitchRelease` tag. It happens in the same server frame as the attack's activation. Damage is computed when a hit lands, so the attack that ended Glitch Time gets the bonus too, which is the point of the node.

The order inside that handler matters:

```cpp
// read the ASC before EndGlitchTime forgets it, then the release buff
UAbilitySystemComponent* ASC = GlitchTimeASC.Get();
EndGlitchTime(FString::Printf(TEXT("attack (%s)"), *GetNameSafe(Ability->GetClass())));
ApplyGlitchRelease(ASC);
```

`EndGlitchTime` clears the stored ability system component, so reading it after that call would apply the buff to nothing. A new release removes the old buff and starts a fresh 3 seconds; they don't stack.

**Duration on world time.** The release buff's duration runs on world time, and the world is still easing back from 0.2× to normal for 0.3 s after the attack. So the buff lasts about 3.1 s of real time. An exact 3 seconds would need a real-time timer, and that difference didn't seem worth the extra code. The length is a project setting.

## What the test runs showed

On the combat test map, against a fixed training dummy that logs a damage breakdown for every hit (see [Training Dummies in UE5 Without a New Enemy Class](./2026-11-26-pseudo-training-dummies-combat-test-map)):

- **Unlearned:** window 0.12, duration 2.0, speed bonus 0.5, all four attributes 0. Glitch Time logged `2.00 s real, move speed bonus +0.50`, walk speed went 450 → 675 → 450, and it expired after 1.95 s by the log timestamps. An attack ended it with no release line.
- **Rank 3** (through an unlock-all cheat): the four attributes 0.150 / 1.500 / 0.450 / 0.500, getters 0.27 / 3.5 / 0.95. Glitch Time logged `3.50 s real ... +0.95`, walk speed 360 → 702 (×1.95) → 360, expiry 3.49 s later. The release logged `damage bonus +0.50 for 3.0 s`, the breakdown showed `additive x1.950`, the buff ended after 3.01 s, and the next hit was back to `x1.450`.
- **Rank 1:** getters 0.17 / 2.5, `glitch release: damage bonus +0.20`.
- **Respec:** attributes back to 0 and the next Glitch Time back to 2.0 s and +0.50.
- **Listen server with one client:** nodes the client learned showed the same attribute values and a 0.27 s window on the server's copy and, after replication, on the client's own copy. The host stayed at 0, and respec reset both.

One thing to watch when you script such a test: injecting the attack in the same call as the perfect-dodge cheat activates the attack before Glitch Time starts, because the cheat runs on the next tick. The attack has to be injected afterwards.

Not tested: a real client dash at the maximum window. The value is shown equal on both machines, and the server check reads the same getter. There is also no HUD icon for the release buff yet; the tag is there for one.

## Using the pattern elsewhere

- One replicated attribute per bonus, default 0. Systems read attributes, not node ids.
- One infinite effect per attribute that adds a SetByCaller magnitude. A new bonus is one subclass.
- Per-rank values as an array on the node, set on the spec at apply time. Validate that the array length matches the max rank.
- Decide stacking on purpose. Adding to the existing multiplier term keeps results independent of order.
- If a buff should reward the action that triggers it, apply it in the same frame, before the hit is calculated.
- Remember which clock a duration uses when time dilation is involved.
