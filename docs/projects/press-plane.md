---
title: Press Plane
outline: deep
---

# Press Plane

*Unity, released on Google Play*

Press Plane is an endless sky-run arcade game in the style of Flappy Bird. You hold the screen to power the engines and climb, release to cut the power and fall, and try to last as long as you can. The further you fly, the harder it gets, and the only goal is a higher score.

![Press Plane gameplay screenshot](/projects/press-plane-1.png)

## Controls

There's one input. Hold (touch, or click with a mouse) to climb. Release to descend. That's all, so a run can start and end in seconds, which is why it works well in short sessions on a phone.

## How it differs from Flappy Bird

In Flappy Bird, a tap ignores how fast the bird was falling and sets its upward speed straight to a fixed value. A tap is a jump, and the speed you had a moment earlier doesn't matter. The input is close to on or off.

In Press Plane, the fall speed carries over. While you aren't holding, the plane falls and builds up downward speed. Holding adds upward thrust, and that thrust first has to cancel the downward speed before the plane stops falling and starts to climb. So the same input behaves differently depending on what the plane was doing a moment before.

Three things follow from that:

1. A quick tap after a long drop barely slows you down. To turn around you have to commit to holding, which feels closer to working a throttle than to jumping.
2. Momentum works in both directions. If you hold too long, the plane keeps climbing past where you wanted to stop, so you can overcorrect as easily as undercorrect.
3. Timing means something different. In a tap game you decide when to tap. Here you decide when to start holding and also for how long.

If you've been falling for a while, start holding earlier than feels natural, because the plane needs time to stop before it can rise. When you're climbing, ease off before the gap, because the plane keeps going up after you let go.

## Play in browser

<div style="max-width: 400px;">
<iframe src="https://itch.io/embed-upload/15969002?color=333333" width="100%" height="600" frameborder="0" allowfullscreen></iframe>
</div>

The web build is fine for trying the controls. For a real run, the Android app plays better on a phone.

[Google Play](https://play.google.com/store/apps/details?id=com.devcol.press_plane) · [itch.io](https://devcol.itch.io/pressplane) · [GitHub](https://github.com/devcol-main/PressPlane) · [Trailer](https://youtu.be/zQBN3ye_jtY)
