---
title: Game Loop & UI Redesign
outline: deep
---

# Game Loop & UI Redesign

*Unreal Engine 5, C++*

This project turned a level into a wave-based game loop and added the menus and HUD around it.

<video src="/projects/game-loop-ui-redesign-1.mp4" controls muted playsinline style="width: 100%; max-width: 640px; height: auto;"></video>

Each level has three waves, with spawn timing and items adjusted per wave. The HUD shows score, time, and health, and it follows the current wave. There's a main menu with start and quit, and a game-over menu with restart and return to the main menu. I changed the fonts and button colors from the UMG defaults.

For the optional goals, I added two negative status effects, Slowing and Reverse Controls. They can stack, and each shows its own icon so you can see everything that's active. Widget Animations drive the UI transitions, and buttons get a tween highlight on hover. The bomb has a countdown widget that turns to face the camera only while the bomb is active, so it reads from the player's point of view.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5) · [YouTube](https://youtu.be/v2YNGF5HxqM)
