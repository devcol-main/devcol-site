---
title: "A Coat That Shattered Only After a Fresh Spawn: Anim Drive, and the Test That Hid It"
description: "The player's coat in PSEUDO kept breaking into dark jagged shards around the legs, even after two rounds of cloth fixes. The cause was the Chaos cloth anim drive holding the coat folded from the moment of spawn, and every earlier test had missed it because swapping the mesh in PIE restarts the cloth simulation from a clean pose."
date: 2026-11-01
publishAt: 2026-11-04
track: "Coat shards"
outline: deep
tags: [UE5, Chaos Cloth, Animation, Debugging]
---

# A Coat That Shattered Only After a Fresh Spawn: Anim Drive, and the Test That Hid It

PSEUDO's player character wears a long coat, simulated with Chaos cloth. It's the Paragon Twinblast body, and the coat has given me trouble since the [MetaHuman face work](./2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair). The latest round started with two complaints: the legs poked through it, and just strafing left and right folded it up by 90 degrees. I wanted it to swing 45 degrees at most.

The first fix limited how far the cloth could move from its animated position. That made the coat tear into shards while moving, and a follow-up fix took the solver's iteration and subdivision counts back to Paragon's values and loosened the cap a little. After that one, the coat still broke in normal play: walking and turning near one of the arenas, sword on my back, the lower coat split into flat dark shards and panels sticking out sideways.

Each of those fixes had been tested and looked clean. This post is about why.

## The symptom

- **Expected**: an intact coat that swings a little, at most around 45 degrees.
- **Observed**: the lower coat broken into flat, dark, jagged shards around the legs.
- **Repro**: restart the editor so the mesh asset loads from disk, PIE listen server with one player in a new editor window, spawn, let the sword stow itself, then walk forward, turn, strafe and walk back. Broken in **4 out of 4** fresh PIE sessions.

That last line is the important one, but I only knew to write it that way at the end.

## What I ruled out

The player uses my own copy of the Twinblast mesh, `TwinBlast_ActionHero_Player`, so that I can change the cloth without touching the read-only original from the Paragon pack. That gave me a clean comparison to start with.

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | Only my copy breaks | Same walk with the original Twinblast mesh swapped onto the pawn | Original intact (it flaps a lot, but no shards) |
| 2 | Duplicating the mesh or editing its Max Distance broke the cloth data | Dumped both cloth assets: same 219-vertex sim mesh, 5 LODs, same masks, only the Max Distance values differ. Then the original's **config** on my data | Ruled out: with the original config, my data is intact, also from a fresh spawn |
| 3 | One of the config values | Bisection from the original config towards mine, each step from a **fresh PIE** | **Confirmed**: anim drive |
| 3a | Continuous collision plus a thick collision margin (2.5) keeps particles on the wrong side of a leg capsule | Mine with CCD off | Still broken |
| 3b | Local damping 0.3 makes the coat move as one block | Mine with local damping 0 | Still broken |
| 3c | Anim drive stiffness 0.6 / damping 1.0 | Mine with anim drive back to the Paragon values | Intact, in two runs from a fresh spawn and a final run from disk |
| 4 | Why the previous fix looked clean | Same broken PIE session, then swap the mesh away and back | Intact right after the swap |
| 5 | Stale cached data on disk that an in-memory config edit repairs | Touched one config value without a swap, fresh PIE | Still broken: the edit didn't fix it, the swap did |
| 6 | LOD, face swap or slow motion | Forced LOD 0, the player mesh at spawn, 60 fps, no slow motion in the repro | Not involved |

Rows 1 and 2 together split the problem in one run: the data was fine, so it had to be the config.

### A bisection that lied

One round of the bisection pointed at local damping, and it was wrong. I was setting the values from Python, and some of the cloth config fields are structs (`ChaosClothWeightedValue`, a low and high pair). Python can't build those with `type(v)()`, and that round silently kept the original anim drive while changing local damping. So the "intact" result came from the anim drive I thought I hadn't touched.

I redid rounds 3b and 3c by editing the property's own copy with `import_text(...)`, and added a check that prints any value that didn't get set. A bisection is only as good as the certainty that each step changed exactly one thing.

## The cause

Anim drive is a spring in the cloth solver that pulls every simulated point towards its skinned position (where the animation puts it) and matches its velocity. My config had stiffness 0.6 and damping 1.0 for the whole coat, with no painted map to limit it. It came from an earlier attempt to make the coat flap less, and it had been copied along with the rest of the config when I made the player's own mesh.

On its own, that might be fine. Combined with everything else meant to calm the coat (a tight Max Distance cap of 0.77 times depth, velocity scales of 0.05, damping of 0.3), the coat can't shake itself loose once it starts in a folded state. It stays folded.

The likely trigger is the first frames after spawn. PIE started in the drawn-sword pose and then auto-stowed the sword. The detailed render coat is skinned to the 219-vertex sim mesh with normal offsets, so when sim triangles fold over, render vertices are thrown outwards as flat, dark, back-facing shards. That's what the shards were.

When the simulation is created again later, from whatever pose the character is in at that moment, the coat starts unfolded and stays that way. That's what a mesh swap does. And every test of the previous two fixes had changed the config in memory and swapped the mesh onto the PIE pawn to apply it. Those tests never once saw a coat that had been simulating since spawn.

I didn't isolate the exact first-frame trigger. I did isolate the switch: anim drive on, broken in every fresh spawn; anim drive off, intact in every fresh spawn.

## The fix

Asset changes only, no code. On `TwinBlast_ActionHero_Player` and the headless variant used by the face swap, in the cloth config:

- **Anim Drive Stiffness**: `(0.6, 0.6)` -> `(0, 1)`
- **Anim Drive Damping**: `(1, 1)` -> `(0, 1)`

Those are the Paragon values. With no painted anim drive map, the drive is effectively 0.

Everything else stayed: the Max Distance cap of 0.77 that keeps the swing under about 45 degrees, iteration 2 and subdivision 1, self collision off, damping and local damping 0.3, velocity scales 0.05, collision thickness 2.5 with CCD. The character Blueprint wasn't touched, and the mesh didn't need to be duplicated again.

## Checking it

This time the test followed the repro exactly: save, restart the editor so the asset loads from disk, fresh PIE listen server in a new editor window, `L_Test_Combat`, real frame rate (about 60 fps, no fixed tick).

I took 18 screenshots and checked each by eye: spawn idle with the sword stowed, walking forward, turning, strafing while turning the camera, walking back, dash, after the dash, jump, after landing, an attack with the sword drawn, running and a front view, pistols aimed, 20 seconds of idle, and a camera orbit around the idle character. No shards or folded panels in any of them.

I also ran my cloth probe, a script that drives the host through a fixed movement sequence and measures the hem angle from vertical, with one client connected. Maximum single particle / maximum hem average, in degrees:

| Phase | After the fix |
|---|---|
| Idle | 20.0 / 9.4 |
| Strafe right | 31.4 / 18.7 |
| Strafe left | 62.7 / 42.8 |
| Zig-zag | 65.9 / 43.6 |
| Run | 64.6 / 37.1 |
| Dash | 64.0 / 46.3 |
| Stop | 30.9 / 25.4 |

The client's view of the host's coat came out in the same range (61.5 / 36.7 for strafe left). For comparison, the original Twinblast mesh reached 157-177 / 130-162 in its worst phases. The hem average stays around 45 degrees or below, with the dash a little over it.

One thing I didn't test at runtime is the face swap path, which uses the headless mesh. It got the same two-value change.

## What I took from it

**Cloth tests start from a fresh PIE after an editor restart.** Swapping the mesh, or changing the config and re-applying it, re-creates the simulation and hides anything that goes wrong at spawn. That is exactly how the last two fixes passed their tests while the bug was still there. This is now written down in my tooling notes.

**Anim drive isn't a safe "flap less" knob next to a Max Distance cap.** Both pull the cloth towards the animation, and together they can lock in a bad state. If the swing needs limiting, the cap and the velocity scales do it without that risk.

**Compare against the original asset first, under the same conditions.** Swapping the original mesh in, and then putting the original config on my data, told me data versus config in two runs. Everything after that was a much smaller search.
