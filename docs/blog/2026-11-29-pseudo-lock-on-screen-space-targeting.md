---
title: "Lock-On That Only Picks What the Camera Shows in UE5: ProjectWorldLocationToScreen, a Screen Ellipse, a Camera Sight Trace and a Tolerant Server Check"
description: "How I rebuilt target lock-on in a UE5 third-person multiplayer game so it never picks an enemy off screen: candidates projected with ProjectWorldLocationToScreen into a centred ellipse, a line trace by object type from the camera, a score where screen position beats distance, an occlusion timer for breaking the lock, and why the server re-checks the choice loosely instead of exactly."
date: 2026-11-29
workedOn: 2026-11-01
publishAt: 2026-11-29
track: "Combat"
category: "Build Logs"
sidebar: "Screen-Space Lock-On"
image: /blog/pseudo-lockon-screen-c.jpg
outline: deep
tags: [UE5, Lock-On, Camera, Multiplayer, Gameplay]
---

# Lock-On That Only Picks What the Camera Shows in UE5: ProjectWorldLocationToScreen, a Screen Ellipse, a Camera Sight Trace and a Tolerant Server Check

My first lock-on picked targets by distance and by line of sight from the character's eyes. In play that meant it could switch to a monster standing right next to the player but outside the camera view, and the player had no idea what they had just locked on to. The fix was to make a lock-on candidate something the player can see on screen. In practice that means projecting each enemy's aim point to the screen with `ProjectWorldLocationToScreen`, keeping only points inside a centred ellipse, tracing from the camera rather than the eyes, and scoring by screen position first and distance second. The server can't see the screen, so it checks the client's pick with looser rules, and a false rejection costs almost nothing.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-lockon-screen-c.jpg" alt="Lock-on switched to enemies off camera, so candidates now come from a screen ellipse." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-lockon-screen-c-dark.jpg" alt="Lock-on switched to enemies off camera, so candidates now come from a screen ellipse." loading="lazy">
</figure>

The earlier version of the lock-on, along with the camera modes and hitstop, is in [Witch Time in UE5 Without Slowing the Player](./2026-11-16-pseudo-time-dilation-lock-on-hitstop). The input side (lock on the press, release on a hold) is in [a separate debugging post](./2026-11-01-pseudo-lock-on-click-on-press). This post only covers who gets picked and when the lock lets go.

## What was wrong with eyes and distance

The same report had three complaints: the lock-on chose enemies the camera did not show, the range was short, and gunshots stopped at 30 m. The first one is about the selection rule. A third-person camera sits behind and above the character, so "visible from the character's eyes" and "visible on the player's screen" are different sets. An enemy right beside the character passes an eye trace and a distance check, but it may be outside the frame. Nearest-first scoring then made it the winner.

I wrote the new rules down before changing code:

1. Candidates are living, targetable enemies whose aim point projects inside a centred screen ellipse (70 % of the viewport width and height), within 4000 cm of the player, and visible from the camera.
2. The pick is the smallest normalized screen distance, with 3D distance as a weighted tie-break.
3. Switching uses the same candidates minus the current target. An enemy outside the camera view is never chosen. No other candidate means the current lock is kept.
4. The lock breaks beyond 4800 cm (4000 × 1.2), or after the target has been hidden from the camera for more than 1.5 s without a break.
5. Gun range becomes 10000 cm by default, with a per-ammo override so the shotgun stays short.

## Projecting enemies into a screen ellipse

Every check uses one **aim point** per enemy: a mesh socket named `LockOn` if the mesh has one, otherwise the capsule centre plus 0.4 × the half height, which lands around the chest. Projection, traces and the on-screen marker all use the same point, so what the player sees marked is what was tested.

`APlayerController::ProjectWorldLocationToScreen` gives the screen position. It fails for a point behind the camera, and a failed projection is never a candidate. For a successful one, I normalize the offset from the screen centre by the ellipse's half axes:

```cpp
const double Ex = (Screen.X - 0.5 * SizeX) / (0.5 * Settings->LockOnScreenEllipse * SizeX);
const double Ey = (Screen.Y - 0.5 * SizeY) / (0.5 * Settings->LockOnScreenEllipse * SizeY);
const float Ellipse = FMath::Sqrt(Ex * Ex + Ey * Ey);	// 0 centre, 1 on the ellipse
```

`Ellipse <= 1` means inside. Normalizing by width and height separately makes the shape follow the viewport's aspect ratio, and the result, 0 at the centre and 1 on the edge, works directly as the main score term.

Range is measured from the **player**, not from the camera. Range is a gameplay rule the server also applies; the ellipse is a view rule only the client can apply. Mixing them up would make the server's check depend on where a camera it doesn't have happens to be.

## A sight trace from the camera that ignores pawns

The last check, and the only trace, is a line from the camera view point (`GetPlayerViewPoint`) to the aim point. It is a trace by **object type**, `ECC_WorldStatic` and `ECC_WorldDynamic`, not the `Visibility` channel. Some pawn mesh profiles block `Visibility`, and I wanted "other characters never hide a target" to hold by construction: enemies, other players and the pet drone are `Pawn` objects, so this trace never queries them. The player, the target and both of their attached actors (the weapons) are ignored explicitly.

The old code traced from the eyes because a camera can end up behind a wall. Here the spring arm's collision keeps the camera out of walls, so the camera position is a fair stand-in for "what the player sees".

The trace runs last, so it only runs for enemies that already passed the two arithmetic checks. The function returns one of three states, which the debug view later colours:

- Candidate: inside the ellipse, in range, clear line from the camera.
- Occluded: inside the ellipse and in range, but the trace is blocked.
- Out of view: outside the ellipse, beyond range, or behind the camera.

## Screen position first, distance second

The score of a candidate is

```cpp
OutScore = Ellipse + Settings->LockOnDistanceWeight * Distance / FMath::Max(Settings->LockOnRadius, 1.f);
```

with a weight of 0.25, and the lowest score wins. Screen position dominates on purpose. An enemy at the exact centre 40 m away scores 0 + 0.25. One halfway to the ellipse edge at 5 m scores 0.5 + 0.03. The far one wins, because the player put it in the middle of the screen. With a weight of 1, a near enemy at the edge of the ellipse would beat a far one at the centre, and the lock would go somewhere the player wasn't looking.

Switching target calls the same function with the current target excluded, so a switch obeys every rule a fresh lock does. If the current target dies or becomes untargetable, the next candidate is picked by the same rules, or the lock is released.

## When the lock lets go

Two things break a lock: distance and occlusion.

The range break is beyond `LockOnRadius × LockOnBreakRadiusScale`, 4800 cm, so a lock can be kept a little further out than it can be made.

The occlusion break uses a timer that only counts while the target stays hidden:

```cpp
const bool bVisible = HasCameraLineOfSight(LockTarget);
LostSightTime = bVisible ? 0.f : LostSightTime + RealDeltaTime;
if (LostSightTime > Settings->LockOnLostSightTime)
{
	SetLockTarget(nullptr);	// "occluded for 1.5 s: released"
}
```

Any clear frame resets it, so a target that passes behind a pillar keeps the lock. The timer adds the real frame time, not the world's, because the game has a slow-motion mode and the 1.5 s should stay 1.5 real seconds while the world is slowed.

Going off screen alone does not break the lock. The camera assist turns the view back toward the target, so a target leaving the frame for a moment is expected.

## Why the server checks the choice loosely

The client chooses the target because only the client has the camera. The server just stores the target, which its copy of each attack uses to face the enemy. It re-checks the client's choice, but more loosely:

| Check | Server version | Why it is looser |
|---|---|---|
| Valid target | living, targetable enemy | exact, no timing issue |
| Range | up to 4800 + 200 = 5000 cm | the server sees the client's positions about one round trip late; using the break radius means a lock the client keeps is never rejected |
| Screen | angle between the replicated control rotation and the target at most 90°, skipped under 500 cm | the server has no viewport or field of view, and the shoulder camera skews angles to near targets; 90° still rejects "behind the player" |
| Sight | WorldStatic only, from the eyes or 120 cm above them, to the aim point, actor centre or capsule top; any clear pair passes | the server has no camera (it sits about 90 cm higher and 80 cm to the side), and doors or platforms can be in a slightly different place on the server for a moment |

Leaning toward passing is safe here because of what each mistake costs. A rejection logs a warning and clears the server's target, but the client keeps its own lock (the property replicates with `COND_SkipOwner`), so the player's camera never jumps. The only loss is the facing of the server's copy of an attack. A wrong pass costs nothing, since lock-on gives no damage. The hit pipeline is a different story: there a wrong pass would mean damage that shouldn't happen, so those checks stay strict.

The server range check uses the break radius rather than the lock radius for a specific reason. A player can keep a lock out to 4800 cm, then press switch with only that same enemy around. If the server used 4000 cm it would reject a lock the client is entitled to keep.

## Gun range was one value

The 30 m gunshot limit came from `UPseudoAmmoType::Range`, which defaulted to 3000. Changing the default to 10000 was the whole fix, because one value already drove every part of a shot: the camera aim trace, the muzzle trace, the tracer end point the shot cue receives, and the server's range check. Ammo assets that inherit the default went to 10000. The laser keeps its explicit 5000, and the shotgun keeps 1200. How the shot itself is validated is in [Server-Validated Hitscan in UE5 GAS](./2026-11-19-pseudo-hitscan-pistols-server-validated).

## A debug view that shows each player's own screen

Console variable `pseudo.Debug.LockOn 1` draws, for the local player only:

- a cyan ellipse for the candidate area,
- green boxes with distance and score for candidates,
- red boxes for occluded enemies and grey boxes for enemies out of view (enemies behind the camera are not drawn),
- a large box labelled `TARGET` with a line from the screen centre, which turns red with an `occluded x / 1.5 s` counter while the target is hidden,
- cyan and orange ground rings at the 40 m lock radius and 48 m break radius.

The screen part hooks `AHUD::OnHUDPostRender`, a static engine delegate, and draws only for the HUD whose owner is this pawn's local controller. That avoided adding a HUD class or touching the game mode. The world part (rings, camera-to-target line) is drawn in the tick of the locally controlled pawn's component. With a listen server and a client in two editor windows, each window showed only its own player's view.

## What the tests showed

On the combat test map, with a listen server and one client, real key and mouse input, and frozen enemies:

- An enemy 800 cm ahead locked on one press, 10 out of 10 for each key on both the host and the client.
- A dummy 300 cm behind the player was never chosen: 20 out of 20 presses gave "no candidate", and switching with a target in front gave "no other target, kept" 20 out of 20.
- An enemy behind a wall could not be locked. Hiding a locked target for 1.0 s kept the lock (`visible again after 1.00 s: kept`; 1.02 s on the client), and 2.5 s released it.
- On the host, 3500 cm locked and 4500 cm did not, and the lock broke past 4800 cm. The client was not run for this case; it uses the same local code.
- Basic ammo hit at 9000 cm 7 out of 7 times and 0 out of 4 at 11000 cm. The shotgun hit 0 out of 4 at 9000 cm and 4 out of 4 at 800 cm. No shot was rejected.
- With the pistols drawn, the lock key gave no lock lines.
- The server logged zero `rejected lock` lines in the whole session.

Still open: whether the laser should move to the 10000 default, the debug legend overlapping the health bar, and a hold on an existing lock first logging a switch before releasing. Shots aim from the shoulder camera, which sits 75 cm to the side, so a far target needs the crosshair on it rather than on the character's centre line.

## Building screen-space lock-on in your own game

- **Decide candidates on the screen**, not around the character. Project an aim point with `ProjectWorldLocationToScreen`, treat a failed projection as "behind the camera", and keep points inside a centred ellipse normalized by width and height.
- **Use one aim point** (a socket, or a fixed fraction of the capsule) for projection, traces and the marker.
- **Trace from the camera by object type**, WorldStatic and WorldDynamic, so pawns never block the line. Run it last.
- **Score by screen distance with a small distance weight.** Work out a concrete pair of enemies to check the weight does what you want.
- **Break on distance with some hysteresis, and on continuous occlusion with a real-time timer.** Don't break just because the target left the frame if your camera assist brings it back.
- **Let the client choose and the server check loosely** when the cost of a wrong pass is small. Keep the client's lock even if the server disagrees, and log every rejection so a check that is too strict shows up.
- **Draw the decision.** A debug view with candidate, occluded and out-of-view colours answers "why did it pick that one?" faster than logs.
