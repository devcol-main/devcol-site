---
title: "A Greatsword at the Hip and Swings That Hit Nothing"
description: "Two bugs from the day the greatsword went into PSEUDO. The sword attached to a bone with the right name and appeared 125 cm from the hand, because the same bone name means different things on two Paragon skeletons. Then full combos on a dummy registered zero hits, because a capsule touch is not a hit."
date: 2026-10-19
publishAt: 2026-10-27
track: "Greatsword attach and hits"
outline: deep
tags: [UE5, Animation, Hit Detection, Paragon, Debugging]
---

# A Greatsword at the Hip and Swings That Hit Nothing

PSEUDO's main character is Paragon's Twinblast, a pistol hero. The greatsword and its moves come from a different Paragon hero, Kwang, retargeted onto Twinblast. On the day the weapon system and the hit pipeline both went in, I hit two bugs in a row, one for each:

1. The sword was attached to the "right" bone and showed up near the hip.
2. Once it was in the hand, full five-hit combos against a training dummy registered no hits at all.

Neither turned out to be a code bug. The first was an assumption about bone names; the second was an assumption about what "touching" means. Both are worth writing down because they look like code bugs and invite you to dig in the wrong place.

## Bug 1: the sword floats away from the hand

### Symptom

In a two-player listen-server session, every character had the greatsword, but the blade came out below the waist and the hands were empty. The weapon data said:

- `AttachSocket = weapon_r`
- `AttachOffset = identity`

That's the natural setup. Kwang's greatsword is skinned to his `weapon_r` bone, I'd extracted the sword as its own mesh with the pivot at Kwang's `weapon_r`, and Twinblast also has a `weapon_r`. Same name, same parent. It should have just worked.

### What I checked

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The mesh pivot is wrong after extraction | Static mesh editor: pivot at the grip, blade along local −Y | Ruled out |
| 2 | Twinblast's `weapon_r` isn't where Kwang's is | Queried the bone on a live pawn: parent and local offset | **Confirmed** |

The numbers made it obvious:

| Skeleton | `weapon_r` parent | Local offset from `hand_r` | Distance |
|---|---|---|---|
| Kwang (reference pose) | `hand_r` | (−10.1, 5.9, 2.1) | ~12 cm |
| Twinblast (live pawn) | `hand_r` | (−40.6, 117.5, −16.4) | **~125 cm** |

### Root cause

Both skeletons have a `weapon_r` under `hand_r`, but they mean different things. On Kwang it's the sword grip: about 12 cm from the hand, right in the palm. On Twinblast it positions the pistol rig, which sits far from the hand because his pistols are skinned straight into the body mesh rather than held as separate objects.

The retarget from Kwang to Twinblast moves the animated bones, but it doesn't relocate Twinblast's `weapon_r` into Kwang's grip position. So "attach to `weapon_r`" put the pommel 125 cm from Twinblast's hand, which in his animated pose lands around the hip.

### Fix

Data only, on the greatsword's weapon definition:

- `AttachSocket` = **`hand_r`** (a bone that means the same thing on both skeletons)
- `AttachOffset` = Kwang's reference-pose `weapon_r` local transform, i.e. translation (−10.144, 5.902, 2.104) and its rotation

In other words, I carry the source hero's grip offset in the weapon data and attach to the hand. The sword now sits 11.9 cm from `hand_r` on all four pawns in a two-player session (two on the server, two on the client), the same as on Kwang, with the pommel in the right hand.

### The rule I took from it

Don't assume bones with the same name mean the same thing across Paragon heroes, or across any two skeletons from one pack. Before attaching something to a named bone, check its offset from its parent. For weapons borrowed from another hero: attach to the hand and put the source hero's grip offset in the weapon definition.

One limitation I've noted: if any of Kwang's animations move `weapon_r` relative to the hand (a flourish, a twirl), that motion is lost with this approach. None of the current moves need it.

## Bug 2: full combos, zero hits

### Symptom

With the sword in the hand and the hit pipeline in, I chained Light 1 to Light 5 into training dummies about 1.8 m ahead. The combo advanced on every input. The log showed no hits, and, just as telling, no server rejections either. The server wasn't refusing hits. Nothing was being reported in the first place.

### How hit detection works here

To make sense of the investigation, here's the shape of the detection (the [Damage Formula](/wiki/systems/damage-formula) page has the full path):

1. During an attack's hit window, the attacker sweeps several points along the blade between last frame and this frame.
2. A **broad phase** finds characters near the sweep (their capsules).
3. A **narrow phase** sweeps against the target's **physics bodies**, the per-bone shapes in its Physics Asset, to find which bone was hit and where.
4. Only a narrow-phase hit counts. Touching the capsule alone is a miss, by design, so a swing that passes next to someone's arm doesn't hit them because their collision cylinder is fat.

### What I checked

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The blade simply doesn't reach | Sampled the blade-tip socket every 0.1 s: closest point x = −261, dummy capsule front at x = −254 | Partly, for the first placement |
| 2 | The trace isn't created, the window never opens, or it doesn't tick | Verbose logging on the melee trace category: created, window begin/end, per-point sweeps | Ruled out: windows open, sweeps run |
| 3 | The narrow phase can't hit the dummy mesh at all | Swept a sphere through the dummy by hand: hits `pelvis`, `spine_05`, `calf_r` | Ruled out: bodies are queryable |
| 4 | The broad phase only ever touches the capsule | Sweep log: 1–5 broad hits per point near the dummy, narrow sweep missing by ~10 cm | **Confirmed** |
| 5 | The finisher never hits | Traced the blade tip through Light 5's window: overhead spin at 200–300 cm height, then a slam to the **front-left** | **Confirmed**: the dummies were on the right |

Row 3 is the one that saved time. Before touching the trace code, I checked that a sweep *can* hit the dummy's body at all. Once that passed, the pipeline was fine and the question became purely geometric.

### Root cause

Test geometry. The dummies stood just outside the swings:

- **Light 1–4** arc about 1.6 m ahead and slightly to the right. The dummies were close enough for the blade to touch their capsules (34 cm wide) but not their torsos, which are narrower. About 10 cm short, every swing. By the rule above, that's a miss.
- **Light 5**, the finisher, spends most of its hit window spinning overhead, then slams down to the front-left. The dummies were on the right.

### Fix

I moved the dummies into the swing paths: one front-left, one front-right, plus a far one 16 m away that I use for a fake-hit test (the server must refuse a hit on it). After that, a client-side chain hit `spine_04`, `spine_05`, `upperarm_r`, `calf_l`, `head` and more, on both dummies, exactly one hit per swing per dummy, including the finisher slam. At background editor frame rates the tip moves about 90 cm per frame during that slam, and the multi-point sweep still caught it, which was a nice confirmation that sweeping between frames works.

### What I changed in my process

- **When there are no hits, check in this order:** is the trace running and its window open; does the broad phase find anything; does the narrow phase hit the target mesh. A verbose log category plus a debug console variable that draws the sweeps make the first two checks one command each.
- **Place test enemies from the logged blade path, not from the capsule size.** A capsule makes a dummy look closer to the blade than its body is.
- **Hit windows need retuning.** Light 5's window covers mostly the overhead windup; the slam itself is a short slice of it. That's a feel issue, not a correctness issue, and it's on the list for the combat feel pass. (The finisher has since become an [area attack](/wiki/systems/combo-and-cancels), which changes this again.)

## The common thread

Both bugs came from trusting a proxy. A bone name stood in for "the grip," and a capsule touch stood in for "the blade reached them." In both cases the cheap check was to print the real number: the bone's offset from its parent, the blade tip's closest approach. Ten minutes of measuring replaced what could have been an afternoon in the weapon or trace code, neither of which had anything wrong with it.
