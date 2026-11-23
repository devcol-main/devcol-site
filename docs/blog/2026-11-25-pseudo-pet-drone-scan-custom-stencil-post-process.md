---
title: "Pet Drone, Part 3: A Local Scan Pulse in UE5 With Custom Depth Stencil Outlines, a Post Process Material and the Blendable Location Traps (Auto Exposure, TSR Jitter, Upscaled UVs)"
description: "How I built a Stellar Blade style scan in UE5: a LocalOnly gameplay ability, a world subsystem that outlines actors as a wavefront passes them using CustomDepth stencil values per category, and a post process material. Why a dim before tonemapping got undone by auto exposure, why after tonemapping the outlines jittered under TSR and stencil reads shifted with upscaling, why a Material Parameter Collection rebuild broke the material, and how translucent VFX escaped the effect."
date: 2026-11-25
workedOn: 2026-10-31
publishAt: 2026-11-25
track: "Pet drone scan"
category: "Pet Drone"
sidebar: "Part 3: Scan"
image: /blog/pseudo-drone-scan-c.jpg
outline: deep
tags: [UE5, Rendering, Post Process, Materials, GAS, Multiplayer]
---

# Pet Drone, Part 3: A Local Scan Pulse in UE5 With Custom Depth Stencil Outlines, a Post Process Material and the Blendable Location Traps (Auto Exposure, TSR Jitter, Upscaled UVs)

The drone from [Part 1](./2026-11-24-pseudo-pet-drone-follow-statetree) and [Part 2](./2026-11-25-pseudo-pet-drone-attack-target-kill-credit) gets its third job: on a key press it sends out a pulse, and everything the pulse passes over (items, interactables, enemies, the exit) is outlined in its category's colour, visible through walls, for a few seconds. The reference was the drone scan in Stellar Blade. The short version of how it works: each scannable actor gets custom depth with a stencil value per category, a post process material draws outlines from that stencil, and a world subsystem turns the stencil on for each actor at the moment the growing pulse front reaches it. If you build something similar, most of the time goes into where the post process material sits in the frame. I hit four separate problems that all came from that one setting, and they are listed below with what fixed each one.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-drone-scan-c.jpg" alt="Each scanned actor gets a stencil per category; one post process draws the outlines." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-drone-scan-c-dark.jpg" alt="Each scanned actor gets a stencil per category; one post process draws the outlines." loading="lazy">
</figure>

## What the scan does, and what it does not

- Rank 0 shows five categories: pickups, interactables, normal enemies, elites and bosses, and the exit or objective. Each has its own outline colour. Only outlines, no icons.
- Only actors the wavefront has passed are outlined, in the order it reaches them, and they stay outlined for a few seconds.
- Skill tree nodes raise the range and the highlight time. The only enemy-information upgrade is weak parts: a node that also outlines an enemy's breakable parts that take extra damage.
- It is local to the player who scans. Every player can scan in multiplayer, and nobody else sees it.
- A cooldown, and one tag that disables both scan and drone attack for story moments without the drone.

## Local only, so the server never hears about it

The scan is a gameplay ability with the `LocalOnly` execution policy, bound to an input tag. It is blocked by the dead tag and by the "drone disabled" tag, and it needs a live drone. It reads the scan node ranks from the replicated skill tree, starts a pulse in a world subsystem at the drone's position, and starts a local cooldown.

Because everything after the press runs on the pressing machine, there is no server traffic and no replication to think about. In the listen server test a client's scan produced only client log lines, and the server's world had no highlights and no custom depth changes. If a feature is pure presentation and only one player should see it, `LocalOnly` plus local state saves a lot of work.

## A wavefront that outlines actors as it reaches them

`UPseudoScanSubsystem` is a tickable world subsystem. It only ticks while something is shown.

On the press it walks the actors once and collects every scannable one in range that is not hidden and not dead. Each tick it moves the front outward: radius × the share of the grow time that has passed (later shaped by a curve), measured in real time so slow motion does not slow the scan. Any collected actor inside the front gets outlined:

- `SetRenderCustomDepth(true)` on its primitive components (widgets, text and shape components are skipped, attached actors included),
- a custom depth stencil value that encodes the category (1 to 6).

The subsystem remembers exactly what it changed and restores it when the highlight expires, so it never leaves stray custom depth behind on an actor that had it set for some other reason.

The category comes from a small resolver: an override component if the actor has one (which can also say "never scan me"), else the enemy tier, else item pickup, else the exit portal, else anything that implements the interact interface.

Weak parts were the one case without a mesh of their own. For each part with a damage multiplier above 1 that is not broken, the subsystem attaches a small sphere to the part's first bone, rendered only into custom depth (not the main pass), with its own stencil value.

<figure>
  <img src="/blog/pseudo-scan-01.jpg" alt="Early version of the scan: an elite group outlined in yellow, a minion in red and the exit in cyan, with the drone at the left." loading="lazy">
  <figcaption>The first working version: one outline colour per category (elites yellow, normal enemies red, the exit portal cyan). The drone is the dark sphere on the left.</figcaption>
</figure>

The post process material reads the stencil and draws a coloured outline around each stencil shape. It is placed in the scene by a local, unbound post process volume whose weight is 1 only while something is shown. A Material Parameter Collection carries the scan centre, the radius and the line alpha from the newest pulse to the material. Custom depth with stencil needs `r.CustomDepth=3` in the project's engine config.

## Four problems, all from where the material runs

The [post process materials documentation](https://dev.epicgames.com/documentation/unreal-engine/post-process-materials-in-unreal-engine?lang=en-US) lists the blendable locations. Picking one decides what your material sees and what happens to its output afterwards. These are the four ways it went wrong for me, in the order I hit them.

### 1. Colours added before tonemapping washed out or vanished

My first outlines and the surface scan line were added on top of the scene colour, before tonemapping. On the light grey test floor they washed out to white or disappeared. The fix was to replace the scene colour with the outline and line colour instead of adding to it, with a glow factor of 2.

### 2. A dim before tonemapping was undone by auto exposure

The later look dims the whole screen for a moment when the pulse fires. Done before tonemapping, the darker image fed the exposure histogram and auto exposure adapted back to bright. The engine's order is: material at "after DOF", then TSR, then the exposure histogram, then the tonemapper, then "after tonemapping". So anything you darken before the histogram is something auto exposure will try to correct.

### 3. After tonemapping, the outlines shook every frame

Moving the material to after tonemapping avoided the exposure problem, but now the screen shook during the scan. After tonemapping is also after the temporal upscaler: depth and stencil reads there carry the per-frame sub-pixel jitter that TSR normally resolves, so edges and outlines moved slightly every frame.

There was a second problem in the same place. After tonemapping the output is upscaled, so each scene texture has its own UV mapping. With one shared UV, the stencil reads were offset from the colour: filled shapes with ghost outlines next to them. In a Custom node the fix is to get the UV per texture with `GetDefaultSceneTextureUV(Parameters, id)`. And `SceneTextureLookup` inside a Custom node sampled a single point for the whole screen in my case; separate `SceneTexture` nodes fed through their UV input worked.

### 4. What I ended up with

The material went back before the upscaler, at "Scene Color After DOF", where TSR stabilises the outlines. To keep the dim from being adapted away, the scan's post process volume holds auto exposure still while the scan is shown (`AutoExposureSpeedUp` and `AutoExposureSpeedDown` at 0.01). The outlines also became one-sided (only pixels just outside a higher stencil, so 1 px), and the highlight time came down from 6 / 9 / 12 s per rank to 3 / 4.5 / 6 s.

## Keeping things out of the effect

Two kinds of objects needed a way past the dim:

- **The scan's own ring and band meshes** around the drone were dimmed like the rest of the scene. They are translucent unlit materials that write custom depth with their own stencil value (8), and the post process leaves that value undimmed.
- **The owner and the drone** get stencil 7 for about two frames when the front passes them, a short white blink.

The opposite problem came from imported VFX. The burst effect at the drone came from a marketplace pack whose materials used the "After DOF" translucency pass. That pass is composited after my "after DOF" post process, so the effect showed its original red colours on top of the scan. Switching our copies of those materials to "Before DOF" put them under the scan's wash.

<figure>
  <img src="/blog/pseudo-scan-02.jpg" alt="The scan wave: the floor and walls in a teal halftone, enemies in a pale outlined look, the player and drone undimmed." loading="lazy">
  <figcaption>The reworked look during the wave: a dimmed teal halftone, edge lines on the geometry, and the category outlines on top of the enemies.</figcaption>
</figure>

## A Material Parameter Collection rebuild that broke the material

At one point the scan ran (the log said so) but the screen showed a sepia paper texture: the engine's default post process material. The real material had failed to compile with "CollectionParameter has invalid parameter ScanCenter".

I build these assets with an editor Python script, and re-running it had rebuilt the parameter arrays of the Material Parameter Collection. The parameters got new ids, while the material's collection nodes still pointed at the old ones. The first test after the rebuild still drew from the cached shader, which hid the problem for a while. The fix was to re-link the collection nodes, and to change the script so it keeps an existing collection and only appends missing parameters. If you generate MPCs from a script, never recreate them; the ids are what the materials hold on to.

## The show, on one clock

After the first version worked, I reworked the look to follow the reference more closely. A pulse now has phases (charge, ring, gather, flash, wave, linger, restore, about 4.2 s in total) on a show clock in real time multiplied by a console variable, `pseudo.Scan.TimeScale`, so I could replay it at a tenth of the speed. All phase times live in a look data asset, the wave's speed follows a curve asset, and every fade is derived from the phase times instead of being keyed in seconds, so retiming one phase keeps the rest in step.

A few decisions came out of playing it:

- The ring and the wave centre follow the drone until the wave fires, and the targets in range are collected at that moment, not at the press. In the test the player moved 6 m during the charge, and the wave started from the drone's new position.
- The front is a horizontal distance from the drone, so walls light up at once as it reaches them. A spherical version is an option on the asset.
- The screen dims at the flash and comes back with the restore phase, so the image does not brighten while the effect is still fading.
- A second style, green "digital rain" with 0s and 1s drawn in the shader, is a dropdown on the same asset. Halftone stays the default.

<figure>
  <img src="/blog/pseudo-scan-03.jpg" alt="The alternative code style: the scene drawn as green columns of zeros and ones, with a boss and minions outlined." loading="lazy">
  <figcaption>The second style, selectable on the look asset: green digital rain behind the front. The category outlines are the same.</figcaption>
</figure>

## A flashlight without sampling light

The same work added a flashlight on the drone for dark areas. Measuring how dark the player's position is turned out to be the wrong approach: there is no cheap light query, and Lumen's indirect lighting would not be counted anyway. So darkness is authored. A dark-area volume says "dark here" (an unbound one covers a whole dark map, and a higher-priority volume can mark a lit room inside it). The flashlight component asks at an interval whether the drone is in a dark volume, waits until the answer has held for a short delay, and fades over a fixed time. Each machine checks its own volumes, so the server's volume does not switch on a client's light.

## What I checked

On a listen server with one client:

- The pulse reached 3000 cm, outlines matched the front with no mismatches in three samples at a tenth of the speed, and everything was restored at the end (post process weight 0, no custom depth left on the player or the drones).
- The five categories had their stencil values; the weak-part node marked two parts on the training dummy and one on the boss.
- Pressing during the cooldown did nothing; the disable tag blocked both scan and drone attack.
- A client's scan stayed on the client.

## If you build a scan or highlight effect

- Use custom depth plus a stencil value per category, and let one post process material draw all the outlines. Restore exactly what you changed when the highlight ends.
- Make it `LocalOnly` if only the scanning player should see it.
- Decide the blendable location first. Before tonemapping: auto exposure reacts to your changes. After tonemapping: you are past TSR, so expect jitter, and every scene texture needs its own UV. "Scene Color After DOF" plus holding auto exposure was the combination that worked here.
- Translucent VFX in the "After DOF" pass draw on top of an "after DOF" post process; switch them to "Before DOF" if they must be covered.
- Never rebuild a Material Parameter Collection from a script; append to it.
