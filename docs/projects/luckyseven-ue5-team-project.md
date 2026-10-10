---
title: "LuckySeven: A Three-Stage UE5 Team Game"
outline: deep
description: A third-person ninja action game built by a six-person team in Unreal Engine 5.5 and C++, with a parkour escape, combat with a parry, and a day and night building defense.
---

# LuckySeven: A Three-Stage UE5 Team Game

*Unreal Engine 5.5 · C++ · Team project*

LuckySeven is the team name we used for a third-person, single-player ninja action game for PC. Six of us built it in Unreal Engine 5.5 with C++ and Blueprints from June 22 to July 24, 2026, as the chapter 3 team project of NBcamp's Unreal track (9th cohort). The project itself is called Ninja in the code.

The idea fits in one line: move to survive, fight to hunt, and build to get through the night. Each of the three stages is built around one of those:

- **Stage 1, escape.** No fighting. You get through an escape route with parkour and a grappling wire while staying away from monsters.
- **Stage 2, combat.** You pick up a weapon, which unlocks attacks, bombs, and caltrops, and start hunting monsters. Guarding, parrying, and the inventory come in here.
- **Stage 3, defense.** You build walls and floors during the day and hold off monster waves at night.

We worked in two phases, and after Stage 1 everyone except the HUD lead switched to a different part of the game, so each of us worked on more than one system. In the first phase I did character movement and animation. In the second I built the stage maps and the navigation meshes the monsters walk on, along with PCG decoration, weather, sub-level switching, an intro cutscene, and a room-by-room dungeon generator. The rest of this page covers what the whole team built, and the sections marked "my part" are mine.

## One character, a different controller per stage

Every stage uses the same character, but each one needs different abilities and inputs. The first plan was small teams per stage, but with the time we had, we divided work by area instead (character, AI, maps, and so on). That made the character class a shared file that several people would need to change at once.

We looked at three options:

1. **A character subclass per stage.** Easy to follow, but any change to shared code like movement or health would have to be repeated in every subclass, and each new stage makes the hierarchy deeper.
2. **Everything in one character class.** Only one class to manage, but it turns into a god object, and every new feature means editing the file everyone else is also editing.
3. **Ability components.** Each stage ability is its own component, and a stage only turns on the ones it needs.

We went with components. `ANinjaCharacter` keeps only what every stage uses (move, jump, health) and creates the parkour and wire components in its constructor, all inactive. Each level has its own player controller. When a level loads, `ANinjaGameMode::InitGame()` looks up the map name in a Data Asset that pairs level names with controller classes and uses the first match. After the controller possesses the character, it passes in the list of component classes for that stage, and only those are turned on. The base controller binds the shared inputs, and each stage controller adds its own: the wire in Stage 1, attacks and the inventory in Stage 2, and in Stage 3 the combat keys, the wire, and a key to start the next wave.

This meant the person working on parkour and the person working on the wire never had to touch each other's code or the character class. A new stage ability is a new component plus one line in that stage's controller.

## Stage 1: the escape

### Parkour

Space triggers parkour. A detector traces the obstacle in front of the character to find its height, the depth of its top, what's behind it, and whether the capsule fits on top and where it lands. The actions are checked in a fixed order, hurdle, then vault, mantle, and climb, and the first one whose conditions pass wins. Wall jump is triggered separately. Each action plays a root motion montage, and Motion Warping lines the montage up with the actual ledge. Because detection, choosing an action, and playing it are separate steps, a new move is a new action class.

### The wire

Right click fires the wire. It traces from the center of the crosshair, adds a sphere sweep to help with aiming, and throws out points hidden behind other geometry and floors you can walk on. The remaining candidates are scored by aim angle and distance. Once attached, the wire shortens a little at a time and the character swings under gravity. Only the velocity pointing away from the anchor gets corrected, so the sideways speed that makes the swing stays. When the wire is released, the velocity isn't reset, so the character keeps the momentum from the swing.

The first version had a problem with low shots. If you fired the wire at a shallow angle, the character dropped back to the ground and the wire never pulled them along. The fix had two parts. The pull is now strongest when the wire is close to horizontal and eases off as it turns vertical, with a minimum vertical pull so gravity never wins. And if the character touches the ground while the wire is still attached, the movement mode is set back to falling, so they don't get dragged along the floor.

## Stage 2: combat

### Weapons and the inventory

Attacks are locked until you pick up a weapon. After that, the basic attack is a thrown shuriken on left click, and the two mouse thumb buttons throw a bomb and caltrops, both with an aim line. Pressing E raises a guard for one second, or for as long as you hold it. A hit taken while guarding does half damage, and a hit within 0.5 seconds of pressing guard is a parry and does none.

The inventory opens with Tab and holds items in slots. The shuriken counts as the default weapon, so it doesn't take up a slot. Bombs and caltrops stack in one slot each, and the count on screen updates as you pick more up.

### Monsters and waves

Monsters go from patrol to chase to attack. When a monster's attack collision overlaps its target, it stops and plays its attack montage, and when the attack ends it either attacks again or goes back to chasing, depending on whether the target is still in range. Each state has its own sounds, and death cuts over to the death sound right away.

Each spawner keeps a pool of monsters waiting off to the side and moves them to a random point inside its box when a wave starts, instead of spawning new actors every time. In a wave game where monsters die and spawn every few seconds, `SpawnActor` and `Destroy` add up: each spawn initializes components and allocates memory, and each destroy leaves work for the garbage collector. With a pool, that cost is paid once at `BeginPlay`. Pooling alone still caused a spike when a whole wave was activated at once, so spawns are spread out on a timer, 0.05 seconds apart by default. A wave system actor holds a list of waves, each saying how many monsters each spawner should send. When every monster in a wave is dead, the next wave starts, and after the last one it broadcasts an all-clear event.

### Problems with the monsters

**Bunching up.** When a big wave chased the player, the monsters walked to the same spot and piled up on top of each other. Most of them were inside attack range, but only the ones in front could actually hit anything. `MoveTo` plans a path for one character at a time and knows nothing about the other monsters heading to the same place. Unreal handles that separately with RVO avoidance on the Character Movement Component, which adjusts each character's velocity based on where the characters around it are about to go. Turning on `bUseRVOAvoidance` fixed the pileup. The wider `AvoidanceConsiderationRadius` is, the more neighbors each monster checks every tick, so the team set it to the smallest radius that still worked in play.

**Sliding after death.** A dead monster is sent back to the pool, but it kept the velocity it had right before dying, so it slid through the air with its collision off. Calling `StopMovementImmediately()` on death zeroes the velocity and stopped it.

**Cloth simulation.** Every monster outfit had its own cloth simulation, so the clothes swayed in real time and memory use climbed fast with a full wave on screen. We removed the clothing simulation assets. The clothes don't move anymore, but the frame drops went away.

### The Stage 2 map (my part)

I built the Stage 2 level on a sculpted landscape with three materials blended for the ground, torches with fire effects, and bamboo pulled from a tree pack. Trees and grass were placed in Foliage mode, and the decoration was placed with Unreal's PCG framework.

The rest of the work on this map was about performance and monster movement:

- Shadows are turned off on objects that don't need them, and the background meshes use Nanite.
- Background objects are merged into one actor to cut down on draw calls.
- The trigger component I made uses begin and end overlap events plus a timer that only runs while something is inside, instead of checking on Tick.
- The project's navmesh is set to dynamic, and I used Nav Link Proxies so monsters can jump over obstacles instead of getting stuck behind them.

## Stage 3: build by day, defend by night

In Stage 3 the player defends an objective (the Nexus) with 200 health. If it's destroyed, the game is over. Daytime is for building, and at night monster waves come in. The monster AI switches targets with the time of day: a Behavior Tree service checks whether it's night, and sets the Blackboard target to the player during the day and the Nexus at night. Some monsters can break through the walls the player builds, and a bat monster flies, using a custom behavior tree task and a 3D grid query to pick points in the air.

### Building

Pressing B switches to build mode. The player can place walls, floors, ramps, and roofs on a grid of 400-unit cells, in wood, stone, or iron, and each material has its own health, build time, mesh, and sounds. The preview snaps to the grid and turns green or red depending on whether the current spot is valid.

The work is split three ways so the character doesn't own it all. A build component on the character handles input and the trace that finds where you're aiming. A grid manager holds the world's cell data and how pieces are connected. Each build piece only tracks its own state.

The grid doesn't store every cell in the world. Only cells that have something built in them go into a `TMap`, which keeps lookups fast without filling memory with empty cells. Each cell has separate slots for a floor, a ceiling, a stair, and four walls on its edges. A floor and a north wall can share a cell, but a second floor can't go where there's already one.

Getting placement right took two tries. The first version only checked the cell data: if the slot was empty, you could build. But terrain and level props aren't in the cell data, so the grid didn't see them as support, and you couldn't build on plain ground. The second version checked whether the preview collided with anything and treated a collision as support. That let you build on terrain, but a collision with an existing piece in the same spot also counted as support, so pieces could stack on top of each other. The final version does both, in order: first the cell slot has to be empty, which rules out duplicates, and then the collision and support checks run.

Pieces that touch are linked as a graph. When a piece is destroyed, a breadth-first search walks out from its neighbors. If the search reaches a piece that's on the ground, that group stays. If it runs out of pieces without finding one, the whole group is cut off and collapses. Destroyed pieces go back into an object pool instead of being deleted, since building and chain collapses create and remove the same kinds of actors over and over.

### The Stage 3 map (my part)

Stage 3 uses a modular downtown environment pack. What I added on top of it:

- **Weather and time of day.** The day and night cycle runs on UE's Day Sequence. I combined it with a rain system, and the ground material turns wet while it rains and dries off after. Rain comes in at random, and the last wave always has it.
- **Sub-level switching.** The level is split into sub-levels, and day, night, and other game events swap them. That changes which lights and static meshes are loaded, and the rain changes them too.
- **Navigation.** Two navmeshes joined by Nav Link Proxies. The Nexus is left out of the navmesh.
- **Intro cutscene.** A short sequence that plays when the stage starts.

## The HUD

Most systems in the game run from input to the character. The HUD runs the other way: something changes inside the character, and the screen has to follow. When a controller possesses the character, the HUD manager binds to it and subscribes to delegates for health, the inventory, and so on, and from then on the screen updates when those change. The HUD covers the health bar, the death and clear screens, the inventory, the bomb and caltrop counts, the "press F" pickup prompt, a minimap, and event messages. Gameplay events like reaching an area or clearing a group of targets go through the Gameplay Message Router plugin, so the HUD hears about them without holding a reference to whatever sent them.

### Health bars

Four kinds of things have health in this game: the player, the Nexus, build pieces, and monsters. They don't all show health the same way, because they don't exist in the same numbers:

| Target | How many, how often | How it's shown |
| --- | --- | --- |
| Player | One, always there | Fixed HUD bar, updated by a delegate |
| Nexus | One, always there | 3D widget on the actor, always on |
| Build pieces | Many, but they stay put | 3D widget that only ticks while building or right after a hit |
| Monsters | Many, spawning and dying constantly | 2D widgets drawn by one HUD manager |

Monsters started with a 3D widget each, and each widget turned to face the camera every frame, so the cost grew with every monster on screen. Now monsters have no health bar code at all. A HUD manager component runs a timer 20 times a second, projects each active monster's position to the screen, and moves or hides its widget. Monsters off screen are skipped, and since the widgets are 2D, there's no rotation to compute.

A build piece's bar has two reasons to be visible: it's being built, or it was just hit. Each reason has its own flag, and the bar only hides, and its tick only turns off, when both flags are clear. Otherwise a piece that took a hit while finishing construction would hide its bar too early.

## The dungeon generator (my part)

The dungeon generator runs in its own level, separate from the three main stages. It builds a dungeon out of room blueprints at runtime. Each room has a folder of exit points and a folder of box components that cover its floor space. The steps are:

1. Spawn the starting room at the generator's location and collect its exits.
2. Pick a random room type and a random open exit, and place the new room on that exit.
3. If the new room's boxes overlap an existing room, destroy it and try again. Otherwise, remove the used exit from the list and add the new room's exits.
4. Repeat until the room count is reached, with each step queued on a short timer instead of a loop in one frame.
5. Replace the last room with a boss room, put doors on every exit that was used, and cover the unused ones with walls.

Room overlap uses a separate collision channel, `RoomOverlap`, which ignores everything by default. A seed setting of -1 gives a new layout every time, and any other number gives the same layout every time, which made it easier to test a specific dungeon. The generator can also do ceilings, more than one floor, stairs, and elevators, but we turned those off for difficulty and time. Doors also stay up the first time you go through and only close on the way back.

## Credits

The environments and effects come from free assets on Fab under the Standard License, including Downtown West Modular Pack by PurePolygons, Abandoned Tunnel by Breakbound Dev, Landscape Pro 2.0 by STF3d, Real Stones Pack 01 by Open World Development, torch assets by CodePhase Games and Apex Wolf, and the SFX Essentials free sample by InspectorJ. Event messaging uses the Gameplay Message Router plugin from Epic's Lyra sample.

[GitHub](https://github.com/NBcampUnrealTrack/9th-Team7-CH3-Project/tree/develop)
