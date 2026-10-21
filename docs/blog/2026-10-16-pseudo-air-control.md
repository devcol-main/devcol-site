---
title: "Air Control 0.05: Why My Character Couldn't Change Direction After a Jump"
description: "Jump right, land, press left and jump again, and the character kept drifting right. My first suspect was the input buffer I had just added. The real cause was the engine's default Air Control of 0.05, and a few lines of arithmetic show exactly why it can't reverse a run in one jump."
date: 2026-10-16
publishAt: 2026-10-27
track: "Air control"
outline: deep
tags: [UE5, Character Movement, Debugging]
image: /blog/pseudo-aircontrol-1.png
---

# Air Control 0.05: Why My Character Couldn't Change Direction After a Jump

I jumped to the right, landed, pressed left and jumped again straight away. The character kept going right. Not a little: for most of the second jump it was still drifting the wrong way, and only near the landing did it start to turn. In an action game where you hop around enemies, that reads as the controls ignoring you.

The cause was a single value on the character's movement component, still at the engine default. This post is about how I got there, why the default can't work for this kind of game, and the one habit I took away from it: test the newest change with a single switch before blaming it.

## The setup

- Unreal Engine 5.8, PSEUDO's player character Blueprint (`BP_PseudoPlayerCharacter`) on a C++ base.
- Jump is a Gameplay Ability, triggered through Enhanced Input.
- The day before, I had added an **activation buffer** to the ability system: if you press an ability's input slightly too early, the press is held for 0.15 s and fires the moment the ability can activate.

The repro took ten seconds. Any map, play in editor, one player. Hold right, jump, land, hold left, jump immediately. Expected: the character heads left right away. Actual: it keeps moving right.

## The obvious suspect

A new input buffer had landed the day before the bug, and the symptom involved pressing jump on the landing frame. That made a neat theory:

> The buffer fires the jump on the exact frame of landing, before ground friction has had a chance to remove the old sideways speed. The character leaves the ground still carrying its full run to the right.

It's plausible. It's also the kind of theory that tempts you into rewriting the buffer. Instead I tested it with the smallest possible switch: set `ActivationBufferTime` to 0 for the Jump ability only, rebuild, and try again.

The problem stayed exactly the same. The buffer was innocent.

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The activation buffer fires the jump on the landing frame, before friction removes the old speed | Buffer time 0 on the Jump ability only, rebuilt, tested | Ruled out |
| 2 | Character Movement values on the player Blueprint | Read the Blueprint's defaults (read-only) through the editor link | **Root cause**: Air Control 0.05 |

## The values

Here's what the Blueprint had, untouched since I created the character:

| Property | Value |
|---|---|
| Max Walk Speed | 360 cm/s |
| Max Acceleration | 2048 cm/s² |
| Ground Friction / Braking Friction Factor | 8 / 2 |
| **Air Control** | **0.05** |
| Braking Deceleration Falling / Falling Lateral Friction | 0 / 0 |
| Jump Z Velocity / Gravity Scale | 420 cm/s / 1.0 |

`Air Control` is the fraction of your normal acceleration you get while falling. The engine default for `UCharacterMovementComponent::AirControl` is 0.05: in the air, you have 5 % of the steering you have on the ground.

## Why 0.05 can't reverse a run

Once I had the numbers, the behavior stopped being mysterious. It's a few lines of arithmetic.

**Acceleration in the air:**

```
MaxAcceleration × AirControl = 2048 × 0.05 ≈ 100 cm/s²
```

**Time in the air** for a flat jump, with gravity at about 980 cm/s²:

```
2 × JumpZ / Gravity = 2 × 420 / 980 ≈ 0.86 s
```

**How much sideways speed you can change during one jump:**

```
100 cm/s² × 0.86 s ≈ 86 cm/s
```

**How much you need** to go from a full run right (+360) to a full run left (−360): 720 cm/s.

So one whole jump gets you about an eighth of the way through the reversal. With `Falling Lateral Friction` at 0 there's nothing else slowing you down either.

The landing frame doesn't save you. On the ground, with 2048 acceleration plus friction, a full reversal takes about 0.35 s. If you jump again right after landing, you leave the ground long before that, still carrying most of the old speed, and the air gives you almost nothing to fix it with. That's exactly what it looked like.

It also explains why the buffer theory felt right. The bug only showed when you jumped *immediately* after landing. Wait a third of a second and the ground has already turned you around, so the second jump goes the right way. Timing-sensitive symptom, timing-related new code: easy to connect, and wrong.

## The fix

Two values on the Blueprint's Character Movement:

- `Air Control`: 0.05 → **0.6**
- `Jump Z Velocity`: 420 → **500**

<figure>
  <img src="/blog/pseudo-aircontrol-1.png" alt="Character Movement details panel on BP_PseudoPlayerCharacter showing Air Control set to 0.6 and Jump Z Velocity set to 500, both with the reset-to-default arrow visible" loading="lazy">
  <figcaption>After the fix. The reset arrows next to both values are a handy reminder that they're no longer engine defaults.</figcaption>
</figure>

I picked both by feel while playing, not from a formula, but the formula tells you what they buy. With 0.6, air acceleration is about 1230 cm/s². The higher jump gives about 1.02 s of air time. That's roughly 1250 cm/s of possible speed change in one jump, comfortably more than the 720 needed. You can now turn a run around mid-air, and a jump right after landing goes where you point.

I also reverted the temporary `ActivationBufferTime = 0`. The 0.15 s buffer stays, because it wasn't the problem and it does make inputs feel forgiving.

Verified by playing it: reversing in the air and right after landing both work. I read the values back after the change to make sure the Blueprint had saved them (0.6 and 500).

## Is 0.6 too much?

High air control is a design choice, not a correctness fix. Realistic platformers keep it low, so a jump commits you. Character-action games usually go high, because the player needs to correct position around enemies mid-air. PSEUDO is the second kind.

It's also not final. The ground dash has since landed with the [defense work](/wiki/systems/defense), and an air dash is planned as a skill tree unlock. Once there's a dedicated air movement option, plain air control may come down a bit so the dash has a clear job. I've noted it as a value to revisit then, not a constant.

## What I took away

**Movement feel lives in the Blueprint.** My C++ base class sets up components, but values like air control, walk speed and jump height sit in the Blueprint's defaults. When something feels wrong in movement, those are the first things to read, before suspecting new code. I now list them in my handoff notes when I change them.

**The newest change is a good first suspect, not a verdict.** Code that landed the day before a bug report deserves the first look. But the right first look is one isolated switch (here, buffer time 0 on one ability), not a rewrite. It took a minute to rule out and saved me from "fixing" a buffer that worked.

**Do the arithmetic.** "Air control feels low" is a hunch. "You can change 86 cm/s of the 720 you need" is a reason, and it tells you how far to move the value.

**Engine defaults aren't game defaults.** 0.05 is a reasonable neutral starting point for a template character. It's not a choice anyone made for this game. A new character is a good moment to go through Character Movement once and decide every value on purpose.
