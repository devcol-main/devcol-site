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

## How a few of the pieces work

I used Unreal's built-in tools throughout. Here is what a few of them do, for anyone who hasn't touched them.

**Blend Space and the state machine.** A Blend Space mixes several animations according to one or two input values, usually speed, so Idle, Walk, and Run blend into each other instead of switching abruptly. The state machine decides which group is playing: moving on the ground, jumping, falling, or landing. Each arrow between states has a rule, a condition that has to be true before the animation moves along it.

**State Alias.** An alias stands in for several states at once. A transition drawn from the alias applies to every state it covers, so "any of these can go to Fall" is one arrow instead of one per state. Unreal can also make a transition automatic, firing when the current animation is nearly finished, which suits one-shot clips like a landing.

**Anim Notify.** A notify is an event placed at a specific frame of an animation. When playback reaches that frame it fires, and the Animation Blueprint can respond, for example by playing a footstep sound. The sound is tied to the animation's own frames instead of a separate timer.

**Interp To Movement.** This component moves its actor along a list of points over a set time, and it can loop or ping-pong between them. A pickup that floats up and down needs only two points and a duration.

**Launch Character.** It sets a character's velocity directly, in a direction and strength that you choose. With a random strength added, an exploding enemy knocks the player back a different distance each time.

**Sound Cue.** A Sound Cue is a small graph that plays a sound. Its Modulator node randomizes pitch and volume within a range, so rifle shots and impacts don't sound identical every time.

**Post-Process Volume.** It changes how the whole frame is rendered inside its bounds: exposure, bloom, color, and more. Emissive materials look like they glow mostly because of bloom, and a dark map makes that effect easier to see.

**World-space health bar.** A widget component can draw UI in the 3D world instead of on the screen. In world space it's just another object in the scene, so to stay readable it has to be rotated toward the camera as the camera moves.

## What was hard

Two things made this hard: the five-day limit, and the fact that I'd never used Unreal Engine or Blueprint before. Together they meant that nearly every feature on this page was something I had to learn first and then build.

The footsteps are a good example. Putting the sound directly in the run animation made it keep playing when I jumped mid-run. The fix was a different system I hadn't used yet, custom Anim Notifies called from the Animation Blueprint.

## What was fun

The best part was how little I had to worry about. I wasn't designing a complicated game, and I wasn't thinking about performance, so I could explore and try things just to see whether they worked: a light on the ant because the map is dark, blood and a sound at the exact spot of a hit, ammo that floats.

## What I cut

Blend Spaces for mid-run jumps and landings, landing sounds, destructible barrels, and physics hazards like swaying bridges. All of it went on the backlog.

## Looking back

I didn't think about architecture or optimization at all. I threw in features to see what worked, and it was fun. I started late on a Sunday night, so I never got to more item types and enemy types. My screen recording also came out blurry, which I want to fix before the next video DevLog.

[GitHub](https://github.com/devcol-main/FirstUE5FPS) · [itch.io](https://devcol.itch.io/first-time-unreal-engine5-within-5day) · [Video](https://youtu.be/LYvmCeML3t0)
