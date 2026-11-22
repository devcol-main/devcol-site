---
title: "A Flying ACharacter Bobs at the Water Surface in UE5: bCanSwim Defaults to True and PhysicsVolumeChanged Switches It to MOVE_Swimming"
description: "A UE5 pet drone, an ACharacter flying with the stock UCharacterMovementComponent, kept bouncing up and down at the water surface after its owner dived. NavAgentProps.bCanSwim was left at its default true, so entering a water volume set MOVE_Swimming even from MOVE_Flying, and leaving it set MOVE_Falling, forever. The fix is one line: bCanSwim = false."
date: 2026-11-23
workedOn: 2026-11-22
publishAt: 2026-11-23
track: "Drone swims after a dive"
category: "Debugging / Movement & Combat"
sidebar: "Flying Character in Water"
image: /blog/pseudo-drone-swim-c.jpg
outline: deep
tags: [UE5, Character Movement, Water, AI, Debugging]
---

# A Flying ACharacter Bobs at the Water Surface in UE5: bCanSwim Defaults to True and PhysicsVolumeChanged Switches It to MOVE_Swimming

If you have a flying `ACharacter` (a drone, a bird, a ghost) that is not meant to swim, set `NavAgentProps.bCanSwim` to false on its movement component. The default is true, and with it `UCharacterMovementComponent` switches the character to `MOVE_Swimming` the moment it enters a water volume, whatever mode it was in, flying included. In PSEUDO (UE 5.8.3) that turned the player's pet drone into a cork: after the player dived and came back up, the drone kept bouncing at the surface, flipping between Swimming and Falling about every half second.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-drone-swim-c.jpg" alt="The drone could swim by default, so water switched it out of flying and it bobbed forever." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-drone-swim-c-dark.jpg" alt="The drone could swim by default, so water switched it out of flying and it bobbed forever." loading="lazy">
</figure>

## A drone that follows its owner under water

The pet drone is an AI-controlled `ACharacter` in `MOVE_Flying`. Its follow point is the owner's position plus 150 cm, and its controller moves it there directly, without path following. On land it hovers still next to the player.

The report: dive, come back to the surface, and the drone keeps bouncing up and down on its own. I reproduced it in a dive pool in a test map, as a listen server with one client: drop in, dive, swim down, come back up, then stand still.

## Owner or drone?

The drone's follow code adds the owner's velocity, so the first suspect was the player's own surface float. If the owner bobbed, the drone would copy it. But over the idle window the owner's height range was 0.0 cm.

Next I logged the drone's movement mode and height every frame, on both worlds. The answer was in the mode column. The drone went from Flying to Swimming 2.75 s into the dive, at a height of -23 (the surface is at -20), as it entered the water behind the owner. After the owner surfaced, the drone flipped Swimming, Falling, Swimming, Falling, about every 0.5 s. Its idle height range was 59.8 cm on the host world and 63.9 cm on the client world, with vertical speed up to 314 cm/s. The same idle on the pool deck: 0.0 cm, Flying only.

A quick check of the drone's class defaults from editor Python explained why. Its movement component was the engine's plain `UCharacterMovementComponent`, not the project's subclass, and `nav_agent_props.can_swim` was true.

## How a water volume overrides flying

`UCharacterMovementComponent::PhysicsVolumeChanged` runs when the character moves into a new physics volume:

- Entering a volume with `bWaterVolume` set, if `CanEverSwim()` is true, sets `MOVE_Swimming`. It does this whatever the current mode is, so a flying character is switched too.
- Leaving that volume while swimming sets `MOVE_Falling`.

`CanEverSwim()` reads `NavAgentProps.bCanSwim`, which defaults to true. PSEUDO's own movement component already overrides `PhysicsVolumeChanged` so that a flying body stays flying, but the drone didn't use that class.

So the loop went like this. The follow point (owner plus 150 cm) took the drone under the surface during the dive. Buoyancy pushed it up and out of the volume, and it became Falling. Gravity dropped it back in, and it became Swimming. The AI move kept pulling it toward the follow point above. Nothing ever set it back to Flying, because that would take a landing on a floor, and a drone over water never lands. It only stopped when the owner walked far enough away.

## The fix

One line in the drone character's constructor:

```cpp
Movement->GetNavAgentPropertiesRef().bCanSwim = false;
```

The Blueprint child inherits it; I checked that its class default reads false. With `CanEverSwim()` false, entering water only calls the path-following `OnUnableToMove`. The drone doesn't use path following, so nothing happens, and it stays in `MOVE_Flying` in and out of the water.

Same harness after the change, driven from the host and from the client, logged on both worlds: dive, surface, idle 10 s; dive, climb out onto the deck, idle; dive twice, idle. In every case only Flying appeared, the idle height range was 0.0 cm and the vertical speed 0.0, the same as the deck baseline. The drone still follows under water; its lowest point was -306 to -312.

## Checking your own flying characters

- Search your project for `ACharacter` subclasses that use `MOVE_Flying`. For each one that should not swim, set `bCanSwim = false` on its movement component, and check that Blueprint children still read false.
- A custom movement component that keeps flyers flying in `PhysicsVolumeChanged` only helps the classes that actually use it.
- When a character jitters, log the movement mode next to the position. Here the mode flip pointed at the cause in a single run, where the position alone only showed "it bounces".

Related: how the drone follows the player in the first place (owner-tracking steering, wall sweeps, the stuck teleport) is in [Pet Drone, Part 1](./2026-11-24-pseudo-pet-drone-follow-statetree).
