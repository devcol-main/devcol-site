---
title: "A Hitch That Always Hit at 61 Seconds: UE5 Garbage Collection, Not the Content on Screen"
description: "A single 50-70 ms frame showed up in the same camera view of every UE5 performance run. It was the engine's periodic garbage collection (gc.TimeBetweenPurgingPendingKillObjects, 61.1 s), and most of its cost came from measuring in a -game run of the editor binary. How to tell a timer hitch from a content hitch, and what to do about the GC frame."
date: 2026-11-14
workedOn: 2026-11-12
publishAt: 2026-11-14
track: "GC hitch at 61 s"
category: "Debugging / Performance"
sidebar: "GC Hitch at 61 Seconds"
image: /blog/pseudo-gc-hitch-c.jpg
outline: deep
tags: [UE5, Performance, Garbage Collection, Unreal Insights, Debugging]
---

# A Hitch That Always Hit at 61 Seconds: UE5 Garbage Collection, Not the Content on Screen

If a long frame lands at the same **world time** in every run, it's a timer, not whatever happens to be on screen. In my case the timer was Unreal Engine's periodic garbage collection, which runs a full mark-and-sweep every 61.1 seconds by default. This post shows how I found that, why a `-game` run from the editor binary makes the GC frame look far worse than it will be in a shipped game, and the options for the GC cost itself.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-gc-hitch-c.jpg" alt="One slow frame in the portal view was the engine's 61-second garbage collection." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-gc-hitch-c-dark.jpg" alt="One slow frame in the portal view was the engine's 61-second garbage collection." loading="lazy">
</figure>

## A portal that seemed to cost 70 ms once per visit

PSEUDO's opening level ends at a portal, with a Cascade effect, a halo, a light and a fluid puddle around it. I measure the level with a scripted performance run: the camera teleports through five fixed views (start, two mid views, a battle view and the portal), warms up, then records frame times for a fixed segment in each view. It runs at 1080p on High with the editor closed.

The portal view averaged about 17.7 ms with a 95th percentile around 19.3 ms. The worst frame was 52 to 70 ms, every run, about five seconds into the portal segment. It was there even with the puddles, decals and Niagara systems hidden. The stat CSV columns for that frame showed nothing unusual. My target for the worst frame near the portal was 25 ms or less.

Since the portal was the expensive-looking thing on screen, it was the natural suspect: a first spawn of the portal effect, a pipeline state or shader compile, the puddle simulation.

## Logging world time on every long frame

I changed the run script to print a line for every frame over 25 to 30 ms, with the view name, the time into that view, and the time since the map started:

```text
hitch portal t 8.7 s world 61.2 s dt 70 ms
```

Across four runs the hitch sat at **world 61.1 to 61.2 s**, 8.7 s into the portal segment. The warm-ups and four earlier views added up to exactly 60 s before the portal segment began, so the portal view was simply the one on screen at the 61-second mark. 61.1 s is also the default for `gc.TimeBetweenPurgingPendingKillObjects`, set in `BaseEngine.ini` under `[/Script/Engine.GarbageCollectionSettings]` (the [Garbage Collection project settings](https://dev.epicgames.com/documentation/en-us/unreal-engine/garbage-collection-settings-in-the-unreal-engine-project-settings) page lists it as the game-time delay between purges).

Three checks confirmed it:

- With `log LogGarbage Verbose`, the hitch frame contained `Collecting garbage` and `GC Reachability Analysis total time: 24.08 ms ... 1958502 references from 169289 objects with 0 clusters`.
- An Unreal Insights trace of that frame showed `UWorld_Tick > ConditionalCollectGarbage` taking 52.2 ms of a 58.5 ms game-thread frame.
- Setting the interval to 30 s moved the hitches to world 30.05 s (now in the battle view) and 60.05 s. Setting it to 600 s removed them: the portal view's worst frame dropped to **21.0 to 22.4 ms**.

<figure>
  <img src="/blog/pseudo-gc-hitch-01.png" alt="Game-thread frame time in the portal view against world time, flat near 17 ms with one 58.5 ms spike at 61.18 s" loading="lazy">
  <figcaption>Game-thread frame time in the portal view. Everything sits near 17 ms except one frame at world 61.18 s, the garbage collection.</figcaption>
</figure>

The portal, its effect, halo, light and puddle needed no change at all.

## Where the 58 ms went

The Insights trace broke the GC frame down like this:

| Part of the GC frame (game thread) | ms |
|---|---|
| `PyUtil::CollectGarbage` (Python plugin) | 17.5 |
| rest of `BroadcastPreGarbageCollect` | 8.1 |
| `FRealtimeGC::PerformReachabilityAnalysis` (169,289 objects, 1.96 M references, 0 clusters) | 24.1 |
| `GatherUnreachableObjects` | 2.3 |
| rest of the frame | 6.5 |
| **whole frame (`FEngineLoop::Tick`)** | **58.5** |

Two of those lines exist only because of how I was measuring.

**The Python plugin collects its own garbage before every engine GC.** My performance run is a Python script inside a `-game` run of `UnrealEditor.exe`, and the Python plugin runs a full `gc.collect()` in the pre-GC broadcast. The script's `import unreal` keeps about 80,000 Python objects alive, so that collection cost 17.5 ms. Calling `gc.freeze()` on the Python heap before measuring brought it to about 4 ms and the GC frame from 70.4 ms to 43 to 52 ms. A packaged game has no Python, so this cost isn't real.

**The editor binary loads editor-only objects.** `obj list -countsort` at map start reported 162,754 objects. About 77,000 were editor-only graph data: roughly 38,000 Niagara graph nodes and script variables, 34,000 material expressions, and 5,000 EdGraph nodes, thumbnails and import data. Another 42,600 were script types (`Function`, `Class`, `ScriptStruct`, `Enum`). A cooked game doesn't load the first group, and it keeps the second group in the disregard-for-GC pool so reachability analysis skips it. In my run the log said `CloseDisregardForGC: 0/0 objects`: no pool at all.

The reachability walk scales with the object count and ran mostly on the game thread (each worker thread did about 1.4 ms). So the 24 ms walk is also inflated by uncooked content.

<figure>
  <img src="/blog/pseudo-gc-hitch-02.png" alt="Stacked bars of the GC frame: default 58.5 ms, Python heap frozen 35.2 ms, frozen plus incremental reachability 30.5 ms" loading="lazy">
  <figcaption>The GC frame on the game thread in three runs. Freezing the Python heap removes most of the pre-GC cost; incremental reachability shortens the reachability part but not to zero.</figcaption>
</figure>

## Incremental reachability helps, with a big first slice

UE5 can split reachability analysis across frames ([Incremental Garbage Collection](https://dev.epicgames.com/documentation/en-us/unreal-engine/incremental-garbage-collection-in-unreal-engine); it's still marked experimental in 5.8). I tried:

```ini
gc.AllowIncrementalReachability=1
gc.AllowIncrementalGather=1
gc.IncrementalReachabilityTimeLimit=0.002
```

The GC did spread over 8 frames of 3 to 4.5 ms each, but **the first slice was still 18.5 to 19.8 ms**. In `FastReferenceCollector.h` the collector processes the whole initial object list (56,041 "objects to serialize" here) before its first time-limit check, so the time limit can't cut that slice short. The GC frame went from 35.2 to 30.5 ms of game-thread time. In a cooked build the initial list should be much smaller, so the first slice should shrink with it, but I haven't measured that yet.

## Checking your own hitch

If you have a hitch you can't pin on content:

1. **Log world time for every long frame**, not only time into the current test segment. If the hitch sits at the same world time in every run, look for a timer. 61.1 s, or multiples of it, points at GC.
2. **Change the interval and watch the hitch move.** `gc.TimeBetweenPurgingPendingKillObjects 30` should move it to 30 s; a large value such as 600 should remove it from a short run. Use this only to diagnose.
3. **Read the GC log.** `LogGarbage Verbose` prints `GC Reachability Analysis total time` and the object and reference counts.
4. **Take one Insights trace of the hitch frame.** In my case the stat CSV columns pointed at nothing, and a single trace export named `ConditionalCollectGarbage` straight away.
5. **Don't judge the GC cost from a `-game` run of the editor binary.** It loads editor-only objects, has no disregard-for-GC pool, and runs the Python plugin's collection if Python is loaded. Measure in a packaged build: run it with `-trace=default` or `-LogCmds="LogGarbage Verbose"`, stay in the level for over 70 s, and read the reachability time.

## What I'm doing about the GC frame

I made no game or config change. The portal needs nothing, and the real GC cost has to be measured in the first packaged build. The run script now freezes the Python heap before measuring and prints the world-time hitch line, so GC frames in my measurements look more like a shipped game and are easy to attribute.

If the packaged build still spends more than about 8 ms on the GC frame, the options in order are:

1. Turn on incremental reachability in `DefaultEngine.ini` as above. My C++ already uses `TObjectPtr` for every `UPROPERTY`, which the incremental mode needs for its write barrier.
2. Hide the GC: force it at transitions such as the end of a loading screen, the portal teleport or a cutscene with `GEngine->ForceGarbageCollection(true)`, and raise the interval. Only about 7,800 objects become garbage per minute in this level.

One side finding is still open: every run also has a single 42 to 51 ms frame between world 14.5 and 16.1 s in the start view. There the RHI thread spends about 42 ms in `FD3D12BindlessResourceManager::GarbageCollect` while the render thread waits. Setting `D3D12.Bindless.GarbageCollectLatency 0` didn't remove it, and I haven't found the cause yet.
