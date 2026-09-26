---
title: Press Plane
outline: deep
---

# Press Plane

*Unity — released on Google Play*

A fast-paced, "Flappy Bird"-style arcade game: hold to climb, release to fall, and see how far you can get before the engines give out. One-touch controls, endless difficulty scaling, and pure high-score chasing.

![Press Plane gameplay screenshot](/projects/press-plane-1.png)

## How it differs from Flappy Bird

At a glance, Press Plane looks like a typical Flappy Bird clone — hold to climb, release to fall, dodge obstacles, chase a high score. The core feel is deliberately different, though.

In Flappy Bird, tapping the screen resets the bird's vertical velocity to a fixed jump value, regardless of how fast it was already falling. The tap **overrides** whatever the bird was doing — that snappy, deterministic hop is what makes the game easy to reason about, but it also makes the input fairly binary: you're either flapping or you're not, and the fall speed you had a moment ago doesn't matter.

Press Plane keeps the plane's existing fall velocity in play instead of overriding it. Holding down doesn't teleport the plane upward — it applies continuous upward thrust that has to fight against whatever momentum the plane already built up while falling. If you've been dropping for a while, a quick tap barely slows the descent; you have to hold long enough for the thrust to cancel out the fall speed and actually reverse direction. That changes the game in a few ways:

- A single tap isn't enough to climb — you have to commit to holding, which makes "hold vs. release" feel closer to controlling a vehicle's thrust than triggering a discrete jump.
- Momentum management matters in both directions: holding too long sends you climbing with the same inertia problem now working in reverse, so overcorrecting is just as easy as undercorrecting.
- The skill ceiling shifts from timing a series of discrete taps to modulating *how long* you hold — a small change from the genre's usual all-or-nothing tap, but it's the one thing that was non-negotiable while building this: Flappy Bird's feel, with heavier, more physical flight controls layered on top.

## Play in browser

<div style="max-width: 400px;">
<iframe src="https://itch.io/embed-upload/15969002?color=333333" width="100%" height="600" frameborder="0" allowfullscreen></iframe>
</div>

## Links

[Google Play](https://play.google.com/store/apps/details?id=com.devcol.press_plane) · [itch.io](https://devcol.itch.io/pressplane) · [GitHub](https://github.com/devcol-main/PressPlane) · [Trailer](https://youtu.be/zQBN3ye_jtY)
