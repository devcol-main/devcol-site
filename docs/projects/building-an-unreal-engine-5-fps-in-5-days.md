---
title: Building an Unreal Engine 5 FPS in 5 Days
outline: deep
---

# Building an Unreal Engine 5 FPS in 5 Days

*Unreal Engine 5, Blueprint*

I had never used Unreal Engine before this project. I built this FPS from scratch in five days. Time was short and the work was messy, but it was a good way to learn the engine.

![Building an Unreal Engine 5 FPS in 5 Days gameplay screenshot](/projects/fps-5-days-1.png)

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
<iframe src="https://www.youtube.com/embed/LYvmCeML3t0" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe>
</div>

## What I built

Animation came first. I set up Idle, Walk, Run, Jump, Fall, and Land with a Blend Space and a state machine. A State Alias lets the Fall and Land transitions fire automatically from the Sequence Player rule. Shift sprints and reverts to walking on release, and Space jumps.

The map is dark and crimson, with a Post-Process Volume so emissive materials and glowing elements stand out. The game flows from a loading scene to a video screen, then the main menu, then a Lab level and an Egypt level.

The enemy is an ant. Because the maps are dark, I attached a light to it. When it's hit, a Cascade emitter spawns blood and a sound plays at the impact point with randomized pitch. It speeds up when it spots the player or takes damage, and when it collides with the player it explodes and knocks them back with Launch Character at a random strength. Its health bar is a world-space widget that always turns to face the camera.

Pickups have point lights and particle effects. Ammo floats up and down with an InterpToMovement component, and health pickups have their own movement.

The player has a flashlight on F, with a click sound. Footsteps were the fiddly part. Putting the sound directly in the run animation makes it keep playing if you jump mid-run, so I used custom Anim Notifies, called from the Animation Blueprint and blended with a Sound Modulator and random pitch. Rifle fire, empty fire, and the background music also get random pitch through Sound Cues.

## What I cut

Blend Spaces for mid-run jumps and landings, landing sounds, destructible barrels, and physics hazards like swaying bridges. All of it went on the backlog.

## Looking back

I didn't think about architecture or optimization at all. I threw in features to see what worked, and it was fun. I started late on a Sunday night, so I never got to more item types and enemy types. My screen recording also came out blurry, which I want to fix before the next video DevLog.

[GitHub](https://github.com/devcol-main/FirstUE5FPS) · [itch.io](https://devcol.itch.io/first-time-unreal-engine5-within-5day) · [Video](https://youtu.be/LYvmCeML3t0)
