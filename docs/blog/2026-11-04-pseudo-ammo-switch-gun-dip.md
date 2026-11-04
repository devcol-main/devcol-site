---
title: "The Gun Dipped on Every Ammo Switch: Montages Blend From the Slot, Not the Screen"
description: "Switching away from the Laser or the heavy machine gun in PSEUDO lowered the pistols and raised them again. The cause was an exit clip chained into an enter clip. Replacing them with a direct blend took three tries, and each failed try taught me something about how UE5 montages blend in."
date: 2026-11-04
publishAt: 2026-11-09
track: "Ammo switch blend"
outline: deep
tags: [UE5, Animation, Montages, Debugging]
---

# The Gun Dipped on Every Ammo Switch: Montages Blend From the Slot, Not the Screen

Some of the dual pistols' ammo types in PSEUDO come with a stance. The Laser and the heavy machine gun (HMG) summon a big gun and hold it up. The elemental ammo (Fire, Ice, Poison) raises the pistols into a charge pose. Each stance has an enter animation, an upper-body hold pose, and for the Laser and HMG an exit animation too. The [Weapons](/wiki/systems/weapons) page covers how ammo switching works from the player's side.

Switching from the Laser or the HMG to an elemental ammo looked wrong: the gun went down, then came back up. What I wanted was one continuous move from one held pose into the next.

This is a visual bug, and minor. I'm writing it up because the fix took three attempts, and the two that snapped taught me more about montage blending than the one that worked.

## The symptom

- Laser or HMG to Fire, Ice or Poison: the pistols drop, then rise.
- Laser or HMG to Basic or Shotgun: the same drop, from the exit clip alone.
- **Expected**: one continuous move into the new pose.

Repro: PIE with a listen server and one client on the test map `L_Test_Combat`, unlock everything with `PseudoUnlockAll`, equip the pistols with `PseudoEquip Weapon.Ranged.DualPistols`, cycle to the Laser, wait 2 s, cycle to Fire.

## Measuring a dip

"The gun goes down and up" is easy to see and hard to compare between attempts. So I measured it two ways:

- **Clip sampling**: the hand's height every 0.1 s through each animation clip, read with `AnimPoseExtensions`.
- **A per-frame trace in PIE**: every frame, for both characters in both worlds (server and client, so the owner and the remote copy are both covered), the hand bones' positions and the active montage.

From the trace I took two numbers. The **dip** is the lower of the start and end hand heights minus the lowest height during the switch. The **step** is the largest hand movement between two frames. For reference, the normal idle-to-aim motions move the hands about 2 to 9 cm per frame, so a step well above that is a snap.

## What I tried

| # | Attempt | Result |
|---|---|---|
| 1 | Confirm the cause: exit clip chained into enter clip | **Confirmed**: dip 47 cm |
| 2 | Fix v1: fade the old hold pose out on top of the new one | 57 cm snap during a laser shot |
| 3 | v1, but let an active montage blend out on its own | 28 cm snap |
| 4 | Fix v2: blend the new hold pose in as a montage | 24 cm snap at once |
| 5 | Fix v3: v2, but keep the old hold pose underneath until the montage is fully in | **Pass**: dip 0 |

### 1. The cause

`UPseudoRangedComponent::ApplyStance` always played the old stance's exit montage first, then entered the new stance when the exit started blending out. Both clips pass through a lowered pose:

- The exit, `Ult_End`, takes the hand from 135 cm down to 92 and back up to 145.
- The elemental enter, `ChargeBlast_Start`, starts from the pistol ready pose and goes 150 down to 103, then up to 141.

The PIE trace matched: a 47 cm dip, and the only montages in it were the exit and the elemental enter. No draw, no stow, and the hold pose's blend weight stayed at 1 the whole time. Two full clips, each designed to start or end at rest, played back to back between two raised poses.

The fix direction was clear: when leaving the Laser or HMG, skip both clips and blend straight from the old hold pose to the new one. Getting that blend to actually be smooth was the hard part.

### 2. Fix v1: fade the old pose out on top

A dynamic montage of the old hold pose, blend-in 0, blending out over 0.3 s, played over the new hold pose. From a still hold it was clean, 2 cm per frame.

During a laser shot it snapped 57 cm. Two reasons. A montage played with a blend-in of 0 stops the other montages in its group with a blend of 0, so it hard-cut the laser shot. And the fade started from the old hold pose, not from the pose the shot was in at that moment.

### 3. v1, but leave an active montage alone

If a montage was already playing, let it blend out instead of fading the old pose. Still a 28 cm snap. The laser shot was already blending out at that point, and `Montage_IsActive` and `GetCurrentActiveMontage` both skip montages that are blending out. So the code thought nothing was playing and took the fade path anyway.

### 4. Fix v2: blend the new pose in as a montage

Turn it around: play the new hold pose as a montage that blends in over whatever is on screen. Montages crossfade with each other, so this should cover a still hold, a laser shot and a half-played enter alike.

It snapped 24 cm at once. A montage blends in from the **slot's input pose**, not from what's on screen. I had switched the hold pose under the slot in the same frame, so the montage blended from the new hold pose to the new hold pose, and the old one vanished instantly.

### 5. Fix v3: keep the old pose underneath

Same as v2, with one change: the old hold pose stays underneath until the blend montage is fully in. Then the hold pose is swapped while it's hidden, and the montage hands over in 0.1 s.

That passed: dip 0, a largest step of 2 cm per frame from a still hold, 5.5 to 6.6 from a laser shot, and 15.5 when switching in the middle of an HMG enter, which is the enter's own motion and continuous. Host and client, each seen on the server and the client.

## The fix

A new field on the ammo data asset, `StanceSwitchBlendTime`, set to 0.3 s on the Laser and HMG. It's read from the ammo being **left**. When it's above 0 and the new ammo doesn't share the stance, `ApplyStance` calls a new `BlendIntoStance` instead of exit plus enter:

```cpp
// ApplyStance: before the old exit path
if (const float BlendTime = GetStanceSwitchBlendTime(StanceAmmo, Target); bAnimate && Anim && BlendTime > 0.f)
{
	BlendIntoStance(StanceAmmo, Target, BlendTime);
	return;
}

// BlendIntoStance, new ammo with a hold pose: old hold stays underneath until the montage is fully in
Blend = UAnimMontage::CreateSlotAnimationAsDynamicMontage(To->StanceHoldPose.Get(), Slot, BlendTime, HandOverBlendTime);
Blend->bEnableAutoBlendOut = false;
Anim->Montage_Play(Blend, FrozenRate, EMontagePlayReturnType::MontageLength, To->StanceHoldTime);
// blended in -> SetHoldPose(To) + Montage_Stop(HandOverBlendTime)
```

What happens depends on the new ammo:

| New ammo | What happens |
|---|---|
| Has a hold pose (Fire, Ice, Poison) | The v3 blend above |
| No stance (Basic, Shotgun) | The hold layer eases out keeping the old pose (0.2 s), and a montage on the upper body, such as a laser shot, blends out over the blend time |
| A full-body montage is running (dash, hit reaction) | The new stance is set at once underneath and shows when that montage ends |

Firing has to wait for the blend, the same way it waited for the enter clip. `IsStanceReady` now waits for the blend montage, found with `GetInstanceForMontage` because that one still sees a montage while it's blending out. Presses during the blend are buffered, the fix from [the lost-press bug the same day](./2026-11-04-pseudo-ammo-switch-lost-presses). The server's check that rejects shots fired too early after a switch uses the blend time for these switches instead of the enter clip's length.

Unchanged: switching *into* the Laser or HMG still plays the summon enter, Laser and HMG share a stance and switch without a montage, and so do the elemental types among themselves. A weapon swap or stow from the Laser or HMG still plays the full exit.

## Checking it

Same trace harness, before and after:

| Switch | Before | After |
|---|---|---|
| Laser to Fire | 47 cm dip (138 to 92 to 148) | 0 cm, 2.1 cm per frame |
| HMG to Poison | 47 cm dip | 0 cm, 2.1 cm per frame |
| HMG to Basic | 46 cm dip (140 to 93 to 142) | 0 cm, 1.2 cm per frame |
| Laser to Shotgun during a laser shot | exit after the shot | 0 cm (from the shot pose up to 141), 5.5 to 6.6 cm per frame |

Firing after each switch, in the final run: 0 rejected shots and 0 stuck fires. A tap 0.1 s after Laser to Fire fired the Fire round after the blend; after Laser to Shotgun it fired at once.

## What's left

The big gun now disappears instantly when you switch away from the Laser or HMG. Before, the exit clip put it away. A short dissolve or effect on the switch is on the polish list. Leaving for Basic or Shotgun also blends now; if the exit flourish should stay for that direction only, it needs a second setting.

## What I took from it

**A montage blends in from the slot's input pose, not from the screen.** Whatever feeds the slot on the frame the montage starts is the "from" pose. If you change that input in the same frame, the blend-in is a snap. Keep the old input until the montage is fully in.

**Blend-in 0 is a hard cut for the whole group.** A montage played with no blend-in stops the other montages in its group with no blend-out either.

**Blending out is invisible to the obvious queries.** `Montage_IsActive` and `GetCurrentActiveMontage` ignore a montage that's blending out, though it's still on screen. `GetInstanceForMontage` still finds it. That difference caused one failed attempt here, and the same trap turned up in the fire ability the same day: [a safety check that ended healthy rounds during their blend-out](./2026-11-04-pseudo-fire-blend-out-false-stuck).

**Put numbers on visual bugs.** A per-frame trace of the hand height, in both worlds, turned "it still looks a bit off" into 57, 28, 24 and 0 cm. Without it I'd have judged each attempt by eye, and v1 looked fine from a still hold.
