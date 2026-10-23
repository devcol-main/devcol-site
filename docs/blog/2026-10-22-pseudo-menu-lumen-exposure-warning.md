---
title: "A Red Lumen Warning on an Empty Menu Map: Exposure, Cached Lighting and Why I Turned Lumen Off"
description: "PSEUDO's main menu showed red on-screen text about Lumen cached lighting being clipped and r.EyeAdaptation.CachedLightingPreExposure. I traced the message to the eye adaptation pass in UE 5.8, worked out the exposure window it checks, and fixed it with one unbound post process volume instead of a project-wide setting."
date: 2026-10-22
publishAt: 2026-10-31
track: "Menu Lumen exposure warning"
outline: deep
tags: [UE5, Rendering, Lumen, Debugging]
---

# A Red Lumen Warning on an Empty Menu Map: Exposure, Cached Lighting and Why I Turned Lumen Off

The new main menu in PSEUDO is about as simple as a map gets: a camera, a directional light, a sky light, and a UMG widget on top. Behind the widget, across the middle of the screen, sat a line of red text:

> Cached lighting in Lumen and real-time sky capture lighting is going to be clipped. Please adjust r.EyeAdaptation.CachedLightingPreExposure …

It showed in the editor viewport, in PIE and in a standalone build. The hub and the prototype map never showed it. This is a minor bug, nothing breaks, but it's on the first screen anyone sees, and the message points at a project-wide setting that I didn't want to touch blindly.

<figure>
  <img src="/blog/pseudo-lumen-menu-1.png" alt="PSEUDO main menu with the title, the tagline Will you still roll, Start and Quit buttons, and a faint red line of engine text behind it about Lumen cached lighting being clipped" loading="lazy">
  <figcaption>The menu with the warning behind the widget.</figcaption>
</figure>

## Where the message comes from

The first question was who prints it. A search of the 5.8.3 engine source found the string in `Renderer/Private/PostProcess/PostProcessEyeAdaptation.cpp`, in `EyeAdaptation::WriteWarnings()`. So it's the auto exposure pass, not Lumen itself, that raises the warning.

`WriteWarnings` draws the line only when **all** of these hold:

- the scene has at least one light,
- the view is a main view with a view state,
- pre-exposure is relevant for the view,
- the final post process settings use Lumen for dynamic global illumination,
- and the view's exposure falls outside a window.

The exposure is computed as `ExposureEV = log2(1 / View.PreExposure)`. The window is

`[CachedLightingPreExposure - 14 + 2, CachedLightingPreExposure + 16 - 8]`

which, with the default `r.EyeAdaptation.CachedLightingPreExposure = 4`, is **[-8, 12] EV**.

The numbers come from how Lumen stores lighting it reuses across frames. That cached lighting is kept in 16-bit floats, which cover roughly -14 to +16 EV around the pre-exposure. The engine keeps 2 stops of headroom at the bottom and 8 at the top, and warns when the live exposure leaves what's left. Outside that window, the cached values would clip.

## Why only the menu

The other maps have floors, walls and a sky for auto exposure to settle on. The menu has nothing to look at. The camera sees empty space lit by a directional light and a sky light, and auto exposure keeps adapting to an almost empty frame until its EV is outside [-8, 12]. Every condition in the list is then true: there are lights, it's a main view, and the project default for global illumination is Lumen.

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | A project-wide Lumen or exposure setting is wrong | Only the menu shows the warning; the hub and the prototype map, which have geometry, don't | Ruled out as the main cause |
| 2 | The text comes from the eye adaptation pass | Searched the engine source for the string | **Confirmed**: `EyeAdaptation::WriteWarnings()` |
| 3 | The menu scene drives exposure out of range | Map contents: a camera, a directional light, a sky light, no meshes, no sky atmosphere | **Confirmed** |

## Three ways to fix it

**Change `r.EyeAdaptation.CachedLightingPreExposure` for the project.** That's what the message suggests, and it would move the window. But it moves it for every map, and it changes how Lumen's cached lighting is stored on the maps that are actually lit and played. Retuning the whole game's lighting precision because one empty UI map has nothing to look at is the wrong tool.

**Fix the exposure on the menu.** Manual exposure, or the same value for min and max EV, keeps the EV inside the window. The text goes away, but Lumen keeps running on a screen that has nothing for it to light.

**Turn Lumen off on the menu.** The menu is a UI screen. Lumen global illumination and Lumen reflections cost GPU time there and add nothing visible. With Lumen off, the "final GI method is Lumen" condition is false, and the warning has no reason to fire. This is what I did.

## The fix

One actor on `L_MainMenu`: a Post Process Volume named `PPV_MainMenu`, with

- **Infinite Extent (Unbound)** on, so it applies wherever the camera is,
- Global Illumination → Method = **None** (override checked),
- Reflections → Method = **None** (override checked).

No code and no config change. The rest of the game keeps the project defaults.

<figure>
  <img src="/blog/pseudo-lumen-menu-2.png" alt="The same PSEUDO main menu with the title and Start and Quit buttons, and no red warning text" loading="lazy">
  <figcaption>The same frame with PPV_MainMenu enabled.</figcaption>
</figure>

## Verifying it in both directions

"The warning is gone" proves less than it sounds like, because the warning depends on auto exposure, which takes time to drift. So I checked both directions in the same session:

- **After**: PIE with a listen server and one client on the menu, volume enabled as saved: no red text.
- **Before**: in the same session, I disabled the volume **in the PIE world only**, from Python, leaving the editor level untouched (no dirty packages afterwards). The warning came back at once.
- In the editor level, the saved volume reads back as unbound, GI method None, reflection method None, enabled.

One practical note: engine canvas text like this doesn't show up in my editor tooling's screenshots, which capture the viewport without the canvas layer. These screenshots are real screen captures of the window. If you're checking for on-screen engine warnings with an automated screenshot, make sure it includes the canvas.

## What I took from it

**Find the line that prints the message before following its advice.** The message names a console variable, and the obvious move is to change it. Reading `WriteWarnings` showed that the variable only shifts the window, and that the real trigger here was an empty scene with Lumen on.

**UI-only maps get their own post process.** Menus, loading screens and credits now get an unbound volume with Lumen GI and reflections off, or a fixed exposure. They don't need dynamic lighting, and turning it off removes a class of warnings and some GPU cost.

**On a real level, read the exposure value first.** If this warning shows up on a lit gameplay map, the message includes the current exposure. That tells you how far outside [-8, 12] the scene is, and whether the scene or the setting is the problem, before anything project-wide changes.
