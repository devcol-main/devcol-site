---
title: Game Loop & UI Redesign
outline: deep
---

# Game Loop & UI Redesign

*Unreal Engine 5, C++*

This project turned a level into a wave-based game loop and added the menus and HUD around it.

<video src="/projects/game-loop-ui-redesign-1.mp4" controls autoplay muted loop playsinline style="width: 100%; max-width: 640px; height: auto;"></video>

Each level has three waves, with spawn timing and items adjusted per wave. The HUD shows score, time, and health, and it follows the current wave. There's a main menu with start and quit, and a game-over menu with restart and return to the main menu. I changed the fonts and button colors from the UMG defaults.

For the optional goals, I added two negative status effects, Slowing and Reverse Controls. They can stack, and each shows its own icon so you can see everything that's active. Widget Animations drive the UI transitions, and buttons get a tween highlight on hover. The bomb has a countdown widget that turns to face the camera only while the bomb is active, so it reads from the player's point of view.

## How a level runs

The game has three levels, and `AMainGameState` runs the loop. When a level starts it scatters a batch of random items through the `SpawnVolume`, counts how many of them are coins, and starts wave 1.

A wave isn't a fixed block of time. It's a coin threshold plus extra seconds on the level timer:

- Wave 1 starts with the level and adds 30 seconds.
- Wave 2 starts once the player has collected 25 percent of the level's coins, and adds 20 seconds.
- Wave 3 starts at 50 percent and adds 15 seconds.

The extra time is added to whatever is left on the timer, so a fast player keeps the surplus. Collecting every coin ends the level and loads the next map. If the timer runs out first, it's game over. After the third level the game shows a "Game Complete" screen instead of loading another map.

## Wave contents come from a data table

Each wave's fixed items are rows in a Data Table. A row holds an item class, a wave index, and an amount, and `SpawnFixedItemsForWave()` walks the table and spawns every row that matches the wave that just started. That kept the C++ free of "wave 2 gets this many mines" numbers. The HUD reflects it, with the wave line reading "Add Mine + Bomb" in wave 2 and "MORE BOMB~" in wave 3.

Score lives in the `GameInstance`, not the `GameState`. `OpenLevel` destroys the GameState along with the rest of the level, so keeping the total in the GameInstance is what lets it carry across the three maps. The start and restart buttons reset it to zero.

## HUD and menus

The HUD is a Widget Blueprint. A timer in the GameState runs `UpdateHUD()` every 0.1 seconds, finds the text blocks by name with `GetWidgetFromName()` (Time, Score, Level, Wave, Coin), and sets their text. That's simple but it depends on the names matching, and the code has a note to move to `BindWidget` later.

The main menu and the game-over menu are the same widget. `ShowMainMenu()` takes two flags. With the restart flag it changes the button text from Start to Restart, plays the game-over animation, and shows the total score. With the game-complete flag it also swaps the title text. On game over the controller is paused and the input mode switches to UI only, so the mouse cursor works on the buttons.

## Status effects

The two debuffs are one item class, `ADebuffItem`, with a struct that holds the type, the duration, and an amount, so a Slow item and a Reverse Controls item are the same class with different data.

- **Slow** halves the character's current walk speed and starts a timer that puts it back.
- **Reverse Controls** sets a flag, and `Move()` negates the input while the flag is set. A separate timer clears it.

Each effect has its own timer handle and its own icon on the character's overhead widget, which is why two different debuffs can run together and both show. The debuff enum also has a Blind entry that nothing uses yet.

## The countdown

The explosive item starts with its overhead widget hidden and its tick turned off. Picking it up turns both on and starts a 5-second timer. Every frame the widget reads the time left from the timer handle, updates a text block and a progress bar, and rotates itself toward the camera location. When the timer fires, anything tagged as the player inside the 300 unit explosion sphere takes 50 damage. Those numbers are the class defaults and can be changed per item in the editor.

## Known issue

If the player picks up a second Slow item while already slowed, the code stores the already-slowed speed as the "original" speed, so when the timer ends the character goes back to the slowed speed and not the normal one. Keeping the base speed separate from the current speed would fix it.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5) · [YouTube](https://youtu.be/v2YNGF5HxqM)
