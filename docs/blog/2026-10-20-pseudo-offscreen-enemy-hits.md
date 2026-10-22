---
title: "Hits That Only Landed When the Host Was Watching"
description: "On a listen server, PSEUDO's melee grunt stopped hitting anyone the moment the host looked away. The server wasn't refreshing bones for meshes it didn't render, so the weapon-socket sweep went from the same point to the same point every frame. One mesh setting fixed it."
date: 2026-10-20
publishAt: 2026-10-29
track: "Off-screen enemy hits"
outline: deep
tags: [UE5, Animation, Networking, GAS, Debugging]
---

# Hits That Only Landed When the Host Was Watching

The day the first melee grunt went into PSEUDO, I found [two bugs](./2026-10-20-pseudo-first-enemy-camera-and-facing) by playing instead of testing: a camera that jerked whenever someone walked behind the player, and a grunt that never turned to face its target. This is the third bug from that session, and it was the one that worried me most, because it would have broken every fight on a dedicated server and I would not have seen it in normal testing.

The short version: the grunt's swings only hit when the listen-server host's camera could see the grunt.

## How the hit detection works

To make the rest of this make sense, here is the relevant part of PSEUDO's melee pipeline.

- Hits are judged **on the server only**. Clients predict the swing animation and play a local hit cue, but damage is decided by the server.
- A melee swing runs an ability task, `UPseudoAbilityTask_MeleeTrace`. Every frame during the swing's active window it reads two socket locations on the weapon (`GetSocketLocation`) and sweeps between where they were last frame and where they are now.
- What the sweep hits is the target's physics bodies, which follow the target's skeleton.

So the trace depends on bones twice: the attacker's weapon sockets, and the victim's physics bodies.

## Symptom

In a listen-server session with two players, I put the client 110 cm in front of an attacking grunt. That distance had produced a hit on every swing earlier in the same session. This time: 91 swings, zero `hit at` lines in the log, zero damage.

The difference between the two runs was where the host was. In the earlier run the host was standing near the fight. In this one I had teleported the host far away so it would not get in the way, and its camera was pointing somewhere else entirely.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The client is out of the grunt's reach | Earlier distances: 182 cm missed, 110 cm hit | Ruled out for this case, 110 cm is in reach |
| 2 | The hit is found but then filtered (target dead, already hit by this swing) | The `hit at` log line is printed before any filtering of the result, and it never appeared | Ruled out: the sweep itself never reported a hit |
| 3 | The server doesn't update the bones of meshes it isn't rendering | On the server: the grunt's mesh had `VisibilityBasedAnimTickOption = AlwaysTickPose` and `WasRecentlyRendered()` returned false. I switched the option to `AlwaysTickPoseAndRefreshBones` at runtime | **Confirmed**: 7 hits in the next 5 seconds |

The second row is the one that saved time. Because the log line sat before every filter, "no log at all" meant the problem was upstream of my damage code, in the geometry of the sweep itself.

## Root cause

Skeletal mesh components have a setting, `VisibilityBasedAnimTickOption`, that decides how much animation work to do when the mesh isn't visible. The default for an `ACharacter`'s mesh is `EVisibilityBasedAnimTickOption::AlwaysTickPose`:

- the anim graph keeps ticking and montages keep advancing, so animation state stays correct;
- but **bone transforms are not refreshed while the mesh isn't rendered**.

That's a sensible optimisation for a game client. Nobody can see those bones, so why compute them?

The catch is that a listen server is also a game client. It renders what the host's camera sees and nothing else. With the grunt off-screen for the host, its montage was advancing, its attack ability was running, and the trace task was ticking, but the weapon sockets stayed frozen in the last pose that had been rendered. Every frame the sweep went from the same point to the same point. A zero-length sweep from a sword frozen somewhere above the grunt's shoulder never reaches a player standing in front of it.

The same thing applies to the victim's side: its physics bodies follow its bones, so an unrendered victim can also be standing in a stale pose as far as the server's collision is concerned.

That also explains why my earlier tests passed. The host happened to be looking at the fight. And on a dedicated server, which renders nothing at all, this would have failed for **every** fight, every time.

## Fix

In the shared character base class, on the server only:

```cpp
void APseudoCharacterBase::BeginPlay()
{
	Super::BeginPlay();

	if (HasAuthority())
	{
		// Server-side hit detection reads sockets and physics bodies,
		// so bones must be current even when this machine doesn't render the mesh.
		GetMesh()->VisibilityBasedAnimTickOption =
			EVisibilityBasedAnimTickOption::AlwaysTickPoseAndRefreshBones;
	}
}
```

I deliberately left clients on the default. Clients never judge hits, so an off-screen character on a client can keep skipping the bone work, which is exactly the saving the default is there for.

The cost lands on the server: every character now refreshes its bones every frame whether anyone sees it or not. With a handful of enemies that's nothing. With many enemies on screen at once it becomes a real cost, and the place to claw it back later is animation budgeting or update-rate optimisation (URO) for characters far from any player, not turning bone refresh back off.

## Verification

After Live Coding and a fresh PIE session, I teleported the host 6000 cm away, well outside anything its camera could show. The grunt re-targeted the client, and every swing logged `hit at` and applied damage.

## What I took from it

**Server-side gameplay must not depend on rendering.** It sounds obvious written down, but the dependency here was two layers removed: the trace reads sockets, sockets come from bones, and bone refresh is gated on visibility. Anything on the server that reads bones or sockets for gameplay (melee sweeps, socket-based projectile spawns, hit boxes on bones) needs `AlwaysTickPoseAndRefreshBones` on the server, or it needs to stop using bones.

**Test the fight the host can't see.** A listen server hides this class of bug because the host is usually standing right there. My multiplayer test checklist now has a step where the host is deliberately far away, facing elsewhere, while the client fights. A test that only passes in view tells you about rendering, not about the server.

**Put the log line before the filters.** Because `hit at` printed before any of my own filtering, its absence pointed straight at the sweep instead of at the damage code. That ordering is now a habit for every pipeline log I add.

The guard bug that turned up in the same session, a hold-to-guard that never let go, is [the next post](./2026-10-20-pseudo-guard-input-release).
