---
title: "A Beam That Started Off the Gun: Stale Bones on a Player the Client Wasn't Drawing"
description: "On a client's screen, the host's laser beam in PSEUDO seemed to start far from the host's gun. The 290 cm figure never reproduced, but chasing it found a real bug: off-screen remote players kept an old pose, so shot effects read the muzzle from bones that hadn't moved."
date: 2026-11-05
publishAt: 2026-11-07
track: "Remote shot stale muzzle"
category: "Debugging / Networking"
sidebar: "Remote Shot Stale Muzzle"
outline: deep
tags: [UE5, Networking, Animation, VFX, Debugging]
---

# A Beam That Started Off the Gun: Stale Bones on a Player the Client Wasn't Drawing

PSEUDO's dual pistols fire several ammo types, and the big ones (the Laser and the heavy machine gun, HMG) summon a larger gun. The [Weapons](/wiki/pseudo/systems/weapons) page has the design. The hit itself is traced from the camera on the server. The feedback, meaning the muzzle flash, the tracer and the laser beam, is played by a gameplay cue on every machine, and each machine reads the muzzle socket from the shooter's mesh to know where to start it.

During a play session I noticed that on the client's screen, the host's Laser beam started at a point well away from the host's gun, about 290 cm. In that screenshot the host was outside the client's view.

The result is a little unusual: I found and fixed a real bug, and I never reproduced the 290 cm.

## The symptom

- **Expected**: the beam, tracer and flash start at the shooter's muzzle on every screen, within 15 cm.
- **Observed**: on the client, the host's Laser beam appeared to start far from the host's gun.

To compare the two machines, I first made the shot cue log the muzzle it used and where it came from: `muzzle X=.. on <Mesh>/<Socket>`. With a `[server]` and a `[client]` line for each shot, the distance between them is one subtraction.

## What I ruled out

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The cue falls back to the pawn's view location, because the stance gun's mesh is hidden on the remote copy | Mesh and socket in the cue log on both machines | Ruled out: Laser and HMG always read `StanceMesh/Muzzle_03..04` on both |
| 2 | A leader-pose follower returns an identity transform, so the muzzle lands at the world origin. At the spawn point the origin happens to be exactly 290 cm from the Laser muzzle | Muzzles logged in PIE | Ruled out: no shot near the origin; host Laser pairs were 2.0-2.9 cm apart |
| 3 | The pose only differs while the shooter isn't being drawn on the viewer's machine | In-process PIE, client camera turned away from the host | Not testable this way (below) |
| 4 | Same as 3, with the client in a separate process and the host 1200 cm behind the client's camera | Server log against the client's log | **Confirmed on the body sockets**: Basic `Muzzle_01` 30.5 and 33.1 cm off (client height 160, server 185). Laser and HMG stayed within 4.6 and 3.1 cm, with the host standing still |
| 5 | The beam geometry in the original session was wrong on the client | Beam start points in that session's log, server against client | Every client beam started within 3 cm of the server's |
| 6 | The look came from the beam's own sweep | The beam material hides the part of the beam behind a sweep that runs from the muzzle outward; the beam lives 0.5 s | Likely, not proven (below) |

Hypothesis 3 needed its own setup. In PIE with the default settings, every window runs in one process and shares one render time. The host's window always draws the host, so `WasRecentlyRendered` stays true for the host's character on the client's copy too, however you point the client's camera. To get a client that really isn't drawing the host, I ran the client in a separate process (PIE's "Run Under One Process" turned off) and moved the host 1200 cm behind the client's camera.

## The cause

Skeletal meshes have a setting for what to do when they're not visible, `VisibilityBasedAnimTickOption`. The player Blueprint used `AlwaysTickPose`: the animation keeps ticking, but bone transforms are only refreshed when the mesh was rendered recently.

I had already met this once. In [hits that only landed when the host was watching](./2026-10-20-pseudo-offscreen-enemy-hits), the server's melee traces read stale bones from characters the host wasn't looking at. The fix then was to set `AlwaysTickPoseAndRefreshBones` in the character's `BeginPlay`, but only `if (HasAuthority())`, because the traces run on the server.

The shot cue doesn't run only on the server. It calls `GetSocketLocation` on the shooter's mesh on every machine, which reads the component-space bone transforms. On a client, a remote player the client hasn't drawn recently keeps the transforms from the last pose that was drawn, so the muzzle comes from that old pose. The big gun is no exception: it's a leader-pose follower of the body, so its sockets read the body's transforms and go stale the same way.

## And the 290 cm?

It didn't reproduce. The beam start points logged in the original session were within 3 cm of the server's, so the geometry was right at the time.

My best explanation is the beam's sweep. The beam material hides the part of the beam behind a sweep that moves from the muzzle outward over the beam's 0.5 s life. A screenshot taken a few frames after the shot shows a beam that already starts some way down its line, a share of a beam that is 2000-5000 cm long. That would look like a beam starting far from the gun. I haven't proven it, because I have no capture of that moment from the client's window.

So the stale pose is a real bug that would show up as an offset for an off-screen shooter (33 cm here, more if the shooter had moved since the last drawn frame), and the 290 cm was most likely the sweep.

## The fix

Player meshes now refresh their bones when not visible on every machine, not only on the server. In the player character's `BeginPlay`:

```cpp
GetMesh()->VisibilityBasedAnimTickOption = EVisibilityBasedAnimTickOption::AlwaysTickPoseAndRefreshBones;
```

This is for players only. Enemies keep the server-only rule, since there can be many of them and the cost adds up. I also kept the new `muzzle ... on <mesh>/<socket>` part of the cue log line.

## Checking it

Separate-process client, host 1200 cm behind the client's camera, after the fix:

| Shot | Distance between server and client muzzle |
|---|---|
| Basic `Muzzle_01` | 2.2 cm (was 33.1) |
| Laser | 2.9 cm |
| HMG | 1.4 cm |
| Laser, host in view | 2.0 / 2.9 cm |

In-process, with the client as the shooter: Laser 3.0 cm, Basic `Muzzle_01` 2.3 cm. The game and editor targets build.

## What I took from it

**Anything a machine reads from bones needs those bones refreshed on that machine.** The server rule fixed the server's traces. Client-side effects read the same bones on the client, where nobody had changed the setting.

**One-process PIE can't test "not drawn on that machine".** All windows share one process and one render time. For anything that depends on visibility per machine, run the client in its own process.

**Log the start point your effect computed.** Once the cue printed its muzzle, a report like "290 cm off" could be checked against the logs in minutes, and it showed the logged geometry was fine, which pointed me at the material instead.
