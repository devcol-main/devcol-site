---
title: "Camera: States, Modes and Staying Off Walls"
description: "How PSEUDO's third-person camera works: the spring-arm offsets and field of view for idle, combat, sprint and lock-on, how one active camera mode is picked from gameplay tags and blended from whatever is on screen, why blends run in real time during slow motion, how the camera handles walls and characters, and the override mode that turns it into a 2D side view."
publishAt: 2026-11-01
outline: deep
---

# Camera: States, Modes and Staying Off Walls

The camera is the one system the player looks through for every second of play, so most of its work is not being noticed. In PSEUDO it has three jobs: frame the character the same way every time, widen out when a fight starts so enemies stay in view, and get out of the way of walls without snapping. This page covers the values, the mode system that switches between them, and the collision rules.

My reference for the feel was Stellar Blade: a third-person camera with the character pushed to one side of the screen, pulling wider and higher once combat starts. There are no official camera numbers for that game (only community mods with their own values), so every number below is my own, tuned by eye in the editor.

## The setup

The camera sits on a spring arm with a base `TargetArmLength` of 400 cm. Each state changes the arm's `SocketOffset` (X toward the character, Y to the right, Z up), the field of view, and how much lag the camera has.

| State | X | Y | Z | FOV | Lag | What it's for |
|---|---|---|---|---|---|---|
| Idle / explore | 120 | +40 | 10 | 65 | base | Close (about 280 cm from the character), character on the left third of the screen |
| Combat | 60 | +40 | 30 | 75 | base | Farther back and higher, so the enemies around you stay in frame |
| Sprint | 10 | +40 | 10 | 85 | stronger | Pulled back with the widest FOV, which sells speed |
| Lock-on | 60 | +40 | 40 | 75 | base | Combat values, a little higher, blended in 0.3 s |

A few notes on those numbers:

- **Y = +40 puts the camera over the right shoulder.** I started at -40 (left shoulder) and switched on the first day of tuning. With the camera on the right, the character sits on the left of the screen and the space ahead and to the right, where most of the action is, stays open.
- **Idle is close on purpose.** Exploring is where you look at the character and the world. Combat is where you look at enemies, so the arm effectively gets longer and the FOV goes up by 10 degrees.
- **Sprint gets the most FOV and the most lag.** A wider FOV makes the world stream past faster at the edges, and more lag lets the character pull slightly ahead of the camera. Both make 600 cm/s feel faster than it is. The cost is edge distortion, which is acceptable while you're running in a straight line and not while you're fighting.
- **Aim is not decided yet.** Ranged combat will want a tighter over-the-shoulder view for the pistols. Its values will be tuned when that mode is in.

## Camera lag and FOV, briefly

Two terms come up a lot on this page:

- **Camera lag** means the camera follows its target position with a short delay (exponential smoothing) instead of being glued to it. It hides small jitters: steps, landings, the arm shortening at a wall. Lower `CameraLagSpeed` is more lag. In PSEUDO, 15 is "slight" and 5 is "strong".
- **FOV** here is the horizontal field of view. Wider shows more and feels faster, at the price of stretching near the screen edges.

## One active mode, picked by tags

Each state is a data asset, `DA_CameraMode_<State>`, holding the socket offset, arm length, FOV, lag and blend time. A camera mode component on the player decides which one is active.

The selection is a fixed priority list over gameplay tags the player already owns:

```
LockOn > Sprint > Combat > Idle
```

If you're locked on, you get the lock-on mode, whether or not you're also sprinting. If not, sprint wins over combat, and combat wins over idle. The tags come from systems that exist anyway: the non-combat mode sets the combat tag, the sprint ability sets the sprint tag, the lock-on ability sets the lock-on tag. The camera reads state; it never owns it.

### Why not a blended stack

Lyra (Epic's sample game) uses a stack of camera modes that are all blended together by weight. I studied it and chose something simpler: **one active mode at a time**, blended from whatever the camera is showing right now.

The difference shows up when a transition is interrupted. Say you start sprinting, and 0.2 s into the 0.4 s blend toward the sprint values you lock on to an enemy. A naive blend would start again from the sprint values (which the camera never actually reached) and the view would pop. Blending from the current on-screen values means the new blend starts exactly where the camera is, so an interrupted blend never jumps. For four or five modes that's all the behavior I need, and it's much easier to debug than a weighted stack.

### Blends run in real time

PSEUDO has slow motion: a perfect dodge briefly slows the world. If the camera blended in world time, a mode change during slow motion would take several times longer than intended and the camera would feel stuck. So camera blends run in **real (undilated) time**, 0.3 to 0.5 seconds regardless of how fast the world is running. The player's own timing is never slowed by slow motion either; the camera follows the same rule.

## Staying off walls

A spring arm already shortens itself when something blocks the line between character and camera. The defaults aren't enough on their own, so the collision behavior is set in four layers.

1. **A fatter probe.** The arm's `ProbeSize` went from 12 to 20 cm, which keeps the camera a little further from walls so the near clip plane doesn't cut into them. Camera lag is on (`CameraLagSpeed` 15) so the arm shortening doesn't read as a jump.
2. **Characters don't block the camera.** Only level geometry should pull the camera in. Character capsules and meshes ignore the `Camera` trace channel. This came out of a bug: every time an enemy walked behind the player, the arm shortened to the enemy's capsule and the view snapped forward. The story is in [Two Bugs from the First Enemy](/blog/2026-10-20-pseudo-first-enemy-camera-and-facing).
3. **Level rules, per map.** Small props, foliage and thin pillars ignore the `Camera` channel too (a lamp post shouldn't yank the camera), and Camera Blocking Volumes mark places the camera must not go.
4. **Fast in, slow out.** The spring arm component is a subclass, `UPseudoSpringArmComponent`, with extra feeler rays around the arm that look for obstacles slightly before the main probe hits them. When blocked, the arm shortens quickly; when the obstruction is gone, it eases back out slowly. Pulling in fast avoids clipping; easing out slowly avoids the camera bouncing in and out as you pass a row of pillars.

These collision settings live on the spring arm, not in each camera mode. A wall is a wall in every state.

### When the camera is inside the character

If the camera ends up closer than 50 cm to the character's capsule (backed into a corner, for example), the local character is hidden for its owner so the screen doesn't fill with the inside of a coat. Other players still see it. A dithered fade instead of a hard hide is a polish item for later.

## Character rotation

The camera orbits freely around the character. The character turns to face the direction it moves (orient-to-movement, 720 degrees per second), not where the camera points. That keeps exploration relaxed: you can look around without your character twisting.

In combat that would be a problem, since you want to attack what you're looking at. So the abilities handle it: attacks and lock-on turn the character toward the target themselves. The camera stays a camera.

## Override modes for gimmicks

Some sections need a camera that has nothing to do with the player's state. The mode component has one more entry point for that: `SetOverrideMode`, which places a mode above every tag rule until it's cleared, blended like any other mode change.

The first user is a 2D side-scrolling section. Its mode, `DA_CameraMode_Side2D`, uses a long arm (1100 cm), a small offset up (Z 60), a narrow FOV (55, to flatten the perspective) and heavier lag (8), with a slower 0.6 s blend. While it's active the arm stops following the player's control rotation and holds the volume's side-on rotation instead, with a little rotation lag so turns don't snap.

Leaving the section is the delicate part. If the override was simply cleared, the camera would swing back to wherever the control rotation pointed before the section, which could be anywhere. Instead, on exit the control rotation is set to the side view first, and then the normal mode blends in from there, so nothing pops.

## What's still open

- Aim mode values for ranged combat.
- A dither fade instead of the hard hide when the camera is inside the character.
- Per-level collision cleanup as levels are built.

Related pages: [Combos and Cancels](/wiki/systems/combo-and-cancels) for how lock-on fits into combat, and [Defense](/wiki/systems/defense) for the slow motion that the camera ignores.
