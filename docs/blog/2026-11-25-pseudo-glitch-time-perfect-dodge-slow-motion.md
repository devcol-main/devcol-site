---
title: "Perfect-Dodge Slow Motion in UE5 GAS: Ending It on Any Attack With AbilityActivatedCallbacks, Easing World Time Dilation and Keeping the Effects on Real Time"
description: "How I built a Bayonetta-style perfect-dodge slow motion in UE5 with the Gameplay Ability System: a defense component that owns it, AbilityActivatedCallbacks to end it on any attack ability, an expiry delegate from the time dilation subsystem, eased blend in and out with CustomTimeDilation compensation, a one-shot and a while-active gameplay cue, a glitch post process, and why it is off in multiplayer. Plus two material errors that drew the default material."
date: 2026-11-25
workedOn: 2026-10-31
publishAt: 2026-11-25
track: "Glitch Time"
category: "Build Logs"
sidebar: "Glitch Time Slow Motion"
image: /blog/pseudo-glitch-time-c.jpg
outline: deep
tags: [UE5, GAS, Time Dilation, Gameplay Cues, Post Process, Multiplayer]
---

# Perfect-Dodge Slow Motion in UE5 GAS: Ending It on Any Attack With AbilityActivatedCallbacks, Easing World Time Dilation and Keeping the Effects on Real Time

A perfect dodge in PSEUDO slows the world for two seconds while the player keeps full speed. I call it Glitch Time. The slow-motion mechanics already existed (a stack of time dilation requests and `CustomTimeDilation` compensation for the player, covered in [an earlier build log](./2026-11-16-pseudo-time-dilation-lock-on-hitstop)); this part turned it into a feature you can feel. If you are building something like it, the reusable parts are: end the slow motion the moment the player attacks by listening to `AbilityActivatedCallbacks` on the ability system component instead of editing every attack ability, let the time system tell the owner when a request expires instead of running a second timer, ease the world in and out without slowing the player's controls, and time every fade and sound on real time.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-glitch-time-c.jpg" alt="One ability activation callback ends the slow motion on any attack." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-glitch-time-c-dark.jpg" alt="One ability activation callback ends the slow motion on any attack." loading="lazy">
</figure>

## The rules

- A perfect dodge slows the world to 0.2 for 2.0 s of real time (it was 0.3 before). The player moves at normal speed and gets +50 % move speed on top while it lasts.
- Attacking ends it at once. There is no hitting enemies inside the slow motion; you choose between the free time and the first hit.
- A second perfect dodge during Glitch Time extends it instead of starting another one.
- Feedback: a screen effect, sounds, a camera shake with an FOV punch, and an afterimage.
- In multiplayer there is no slow motion, because one player's slow would slow everyone's world (see "slow motion without slow controls" on the [defense page](/wiki/pseudo/systems/defense)). The moment of the perfect dodge still plays its feedback.

## Who owns the slow motion

The perfect dodge is judged in the defense component on the player's pawn, on the server, so that component also owns Glitch Time. The enemy attack ability only reports the result and calls `StartGlitchTime()`. The component:

1. Executes a one-shot gameplay cue for the dodge moment, which runs on every machine.
2. Pushes a personal slow-motion request (0.2, 2 s real) to the time dilation subsystem. In multiplayer the subsystem refuses personal requests, and the function stops here.
3. On the first start only: adds a replicated "Glitch Time" gameplay cue that stays until removed, applies an infinite gameplay effect for the move speed bonus and a state tag, and binds two callbacks.

`EndGlitchTime(reason)` undoes all of it. The reasons are attack, expired, end play, and "no slow motion" in multiplayer, and each one is logged, which made the tests easy to read.

## Ending on any attack with one callback

`UAbilitySystemComponent::AbilityActivatedCallbacks` fires for every ability that activates on that component. The defense component binds to it while Glitch Time runs and checks the activated ability's asset tags against a list in the project settings (the melee combo tag and the ranged fire tag). A match ends Glitch Time.

I liked this more than adding an "end slow motion" call to each attack: the combo and fire abilities did not change at all, and the list of abilities that count as an attack is data. In the test, a sword tap ended it 4 ms after the input, with the log naming the combo ability; the pistols gave the same result with the fire ability.

## Expiry: let the timer's owner say it ended

The time dilation subsystem already times its requests in real time. I added an `OnRequestEnded(Id)` delegate, broadcast from `Pop`, `PopAll` and the expiry in `Tick`. The defense component listens for its own request id and ends Glitch Time when it expires. No second timer means no drift between "the world is back to normal" and "the effects stop".

One ordering detail: when ending for any other reason, the component unbinds from `OnRequestEnded` before it pops its own request, because the pop broadcasts the same delegate and would call back into the function that is already running.

## Extending it with a second dodge

My first refresh was Pop and Push on the same handle, which guaranteed one request per player. It stopped working once the slow motion was eased: a pop starts the ease out and a push starts the ease in again, so the world would visibly speed up and slow down. The subsystem got a `Restart(handle, duration)` that only moves the end time. In the test a second dodge 1.0 s in ended 2.0 s after the second dodge, with no "ended" line between them.

## Easing in and out without slowing the player's controls

Snapping the world from 1.0 to 0.2 felt abrupt, so each request can now carry a blend: blend in, blend out, and two values for the exempt player, a delay and a recover time, all on real time with a smoothstep. The player is slowed together with the world for the first 0.15 s, which gives a short "freeze" on the dodge, and then recovers to full compensation over 0.1 s. When the request ends, the delegate fires at once, so gameplay considers Glitch Time over, and the request then eases back to 1.0 before the subsystem removes it. During that ease the player keeps full compensation, so their speed stays normal while the world catches up.

Sampled every frame in the test (real seconds, world dilation, player `CustomTimeDilation`):

| Phase | Samples |
|---|---|
| Ease in | (0.075, 1.0, 1.0) (0.107, 0.64, 1.0) (0.171, 0.21, 1.0) |
| Player recovers | (0.204, 0.2, 1.54) (0.254, 0.2, 4.28) (0.304, 0.2, 5.0) |
| Ease out after expiry | (2.056, 0.21, 4.83) (2.155, 0.47, 2.13) (2.256, 0.85, 1.18) (2.354, 1.0, 1.0) |

During the ease out the product of the two stays 1, so the player never slows down. Requests without a blend (the ammo wheel, quick-time events, the dice, the debug command) behave instantly as before.

## Two cues: one for the moment, one for the duration

The feedback is split by lifetime:

- **The dodge moment** is a static gameplay cue notify, executed once. Static cues cost nothing per use. It spawns the afterimage for everyone and, only where the dodging pawn is locally controlled, plays the camera shake and the screen flash.
- **The duration** is an actor gameplay cue notify, added and removed. It needs state: a dynamic material instance for the screen effect, the sounds, the fades, and an afterimage trail that drops a ghost every 0.07 s once the player has moved 15 cm. Because the cue tag is replicated as an active cue, a player who joins late still gets it.

Every fade and the camera shake run on real time (`GetRealTimeSeconds`, `DeltaRealTimeSeconds`). With the world at 0.2, a 0.3 s fade on world time would take 1.5 s.

The sounds are laid out over the remaining time, which the cue reads live from the defense component: a start part in the first second, a middle part that is cut short if Glitch Time is short, silence, and an end part that finishes exactly when Glitch Time does. If an attack ends it early, the start and middle fade out in 0.1 s and the end part plays at once. A longer Glitch Time from a future skill rank needs no change to the cue.

<figure>
  <img src="/blog/pseudo-glitch-time-01.jpg" alt="The game in Glitch Time: green tinted screen with scanlines, a horizontal band shifted sideways, and an afterimage of the player." loading="lazy">
  <figcaption>Glitch Time in the test map: green tint, scanlines, a shifted band near the bottom and the player's afterimage. Durations were stretched for the capture.</figcaption>
</figure>

## The glitch screen

The screen effect is a post process material driven by one `Intensity` parameter from the cue. It cuts the screen into horizontal bands that re-roll 12 times a second on real time (with Ignore Pause), shifts some of them sideways, splits the RGB channels a little more on some bands, then desaturates, tints, adds scanlines and a vignette. Every value is a parameter on a material instance, so it can be tuned in the editor while the game runs.

The RGB split needs three samples of the scene at different UVs. Doing that with `SceneTextureLookup` inside a Custom node sampled one point for the whole screen. Three `SceneTexture` nodes, each with its UV input fed by the Custom node's offset, worked.

## Two errors that showed the default material

The first screenshot had a brown textured frame instead of a tint, and no afterimage colour:

- **The post process material did not compile.** It lerped the scene colour (a float4) with the tinted colour (a float3), so the engine drew its default material. Component masks to RGB on both inputs fixed it.
- **The afterimage material lacked the "Used with Skeletal Mesh" and "Used with Clothing" usage flags**, so it rendered the default material on the character.

Both are silent in play: the game runs, it just looks wrong. If a new material shows a checker or a default grey, open it and look for a compile error before anything else.

## Testing

Single player, mostly with a debug command that triggers a perfect dodge:

- World 0.2 and player ×5 at the start; expiry after 1.996 s of real time with world and player back to 1.0.
- A real perfect dodge against a minion slam: the dodge was 0.033 s after the dash, the ammo refill and dice charge still happened, and Glitch Time started.
- The ammo wheel's own slow motion during Glitch Time kept the world at 0.2 and Glitch Time still expired on time.
- Multiplayer (listen server and one client): the client's dodge played the moment cue on the client's screen, the host saw the afterimage, the personal slow motion was refused and the world stayed at 1.0.

What I did not test: a wheel slower than Glitch Time, to see the "slowest wins" rule with these two together; the subsystem logic for it did not change.

## Reusing this

- Put the slow motion in the component that judges the dodge, and give it one start and one end function with a logged reason.
- End it on any attack with `AbilityActivatedCallbacks` and a tag list in settings.
- Get expiry from the time system through a delegate, and unbind before you pop your own request.
- Extend by moving the end time, not by pop and push, once you ease.
- Split feedback into a static cue for the moment and an actor cue for the duration, and run every fade on real time.
