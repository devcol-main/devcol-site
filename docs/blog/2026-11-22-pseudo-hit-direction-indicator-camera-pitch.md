---
title: "A Hit From Behind Lights the Top of the Screen: Camera Pitch in UnrotateVector and a Yaw-Only Frame for UE5 Damage Direction Indicators"
description: "A UE5 damage direction indicator sometimes showed a hit from behind at the top edge. The attacker's direction was converted with the full camera rotation (GetCameraRotation().UnrotateVector), so with a pitched camera the height difference leaked into front and back. Fixed by measuring on the ground plane with a yaw-only rotator."
date: 2026-11-22
workedOn: 2026-11-21
publishAt: 2026-11-22
track: "Hit edge direction"
category: "Debugging / VFX & Rendering"
sidebar: "Hit Edge From Behind"
image: /blog/pseudo-hit-edge-c.jpg
outline: deep
tags: [UE5, Camera, UI, Math, Debugging]
---

# A Hit From Behind Lights the Top of the Screen: Camera Pitch in UnrotateVector and a Yaw-Only Frame for UE5 Damage Direction Indicators

If your damage direction indicator converts the attacker's position into camera space with the full camera rotation, it will get front and back wrong whenever the camera is pitched and the attacker is above or below the player. Use a rotator with only the camera's yaw, and drop the vertical component. That was the whole fix in PSEUDO; the rest of this post shows the numbers that make the old version flip, and why my first test didn't catch it.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-hit-edge-c.jpg" alt="With a pitched camera, an attacker below and behind came out in front." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-hit-edge-c-dark.jpg" alt="With a pitched camera, an attacker below and behind came out in front." loading="lazy">
</figure>

## The indicator and the report

When the player takes damage, PSEUDO lights the screen edge on the side the hit came from: front at the top, back at the bottom, left and right on the sides. A low-health component on the player computes the direction from the hit's source (the enemy that caused the effect, or the blast origin for area hits) and passes a 2D direction to a material.

The report said a hit from behind sometimes showed the marker at the top. My original test had passed: attackers at the player's height and a nearly level camera, with the back hit clearly lighting the bottom edge.

## Two quick suspects, then the math

The material was the first suspect, since a screen position's UV runs top to bottom and an inverted Y is easy to get. The material code flips Y on purpose, and the original test capture of a back hit showed the bottom edge, so that was fine. The source position was the second: for a plain enemy hit it is the enemy itself, which is what it should be.

That left the conversion:

```cpp
Local = CameraManager->GetCameraRotation().UnrotateVector(Source - PawnLocation);
```

`UnrotateVector` with the full camera rotation turns the offset into the camera's frame, including its pitch. The local X axis is then tilted, and for a camera pitched by `p` the forward component is `dx * cos(p) + dz * sin(p)`, where `dx` is the horizontal distance along the view and `dz` the height difference. The height leaks into "forward".

A concrete case: the attacker is 100 cm behind and 150 cm below the player (the player is in the air, or standing on a step), and the camera looks down at -40 degrees. Forward comes out as `-76.6 + 96.4 = +19.8`, which is "in front", so the top edge lights up. The closer the attacker and the bigger the height difference, the earlier it flips. A camera looking up does the same with an attacker above and behind.

## Measuring on the ground plane

The fix keeps only the yaw and flattens the result:

`Offset` is the source minus the pawn location, and `Flat` is the X and Y of `Local`:

```cpp
const FRotator CameraYaw(0.f, CameraManager->GetCameraRotation().Yaw, 0.f);
Local = CameraYaw.UnrotateVector(Offset);
Local.Z = 0.f;
HitDir = Flat.SizeSquared() > 1.f ? Flat.GetSafeNormal() : FVector2f::ZeroVector;   // straight above / below: all around
```

A source straight above or below has no horizontal direction, so it gets a zero vector, which the material shows as an edge all around the screen.

Two small additions made the next bug of this kind easier to see. The log line for a hit edge now prints the camera pitch and the side the old rule would have picked. And a console command, `pseudo.LowHealth.TestEdge <forward> <right> <up>`, plays a hit edge from a point around every local player through the same path as a real hit, so a pitched case can be reproduced without arranging an enemy on a ledge. Real hits from the four directions were then checked on the host and on a client, including the pitched case.

## Where else this rule applies

A screen-side indicator for something on the ground should use a yaw-only frame. Your own direction markers are worth a quick search for `GetCameraRotation().UnrotateVector`.

I left one similar spot alone on purpose. The hit kick that nudges the camera on damage uses the same full-rotation rule, but it pushes the camera, and a small pitch error there is harmless.

The testing lesson is the one I would apply first. Direction features need a test with a height difference and a pitched camera, not only attackers standing level with a level camera, because that is the one setup where the pitch term is zero.
