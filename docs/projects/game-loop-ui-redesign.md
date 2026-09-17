---
title: Game Loop & UI Redesign
outline: deep
---

# Game Loop & UI Redesign

*Unreal Engine 5, C++*

Reworking a level into a proper wave-based game loop, plus the menu and HUD to go with it.

<video src="/projects/game-loop-ui-redesign-1.mp4" controls muted playsinline style="width: 100%; max-width: 640px; height: auto;"></video>

## What was built

- **A three-wave structure per level**, with timing and item spawns adjusted per wave rather than everything dropping in at once.
- **UI tied to the current wave** — the HUD shows score, time, and health, and updates to reflect which wave is active.
- **Menu flow** — a main menu with start/quit, and a game-over menu with restart/return-to-main-menu, both with custom fonts and button styling instead of the default UMG look.

## Stretch goals

- **Two stacking negative status effects** — Slowing and Reverse Controls, each represented by its own status icon in the UI so multiple active effects are visible at once rather than just inferred from how the character is behaving.
- **UI animation** — Widget Animation drives transitions, and buttons get a tween/highlight effect on hover instead of an instant color swap.
- **A camera-facing bomb timer** — the countdown UI only orients itself toward the camera while the bomb is actually active, so it reads correctly from the player's point of view instead of being a flat billboard sitting in world space at an arbitrary angle.

## Links

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5) · [YouTube](https://youtu.be/v2YNGF5HxqM)
