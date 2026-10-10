---
title: TEAM8-Text-Console-RPG
outline: deep
---

# TEAM8-Text-Console-RPG

*C++*

TEAM8 is an auto-battler text RPG we built as a team in C++. We wanted it to feel like an old text RPG, so the whole game is one console window split into panels that show the scene, stats, inventory, log, and kill list at the same time.

![TEAM8-Text-Console-RPG split-screen gameplay](/projects/team8-text-console-rpg-1.jpg)

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
<iframe src="https://www.youtube.com/embed/NSOMsNnxaiw" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe>
</div>

## How we built it

We divided the work using a diagram we drew in Notion before starting. The Item, Inventory, Character, Monster, UI, Shop, and Sound systems all hang off a central GameManager. Two things changed along the way. Game logs and other UI elements needed an owner, so we added a UIManager. Combat logic had piled up inside GameManager, so we moved it into its own BattleManager.

## A run from start to finish

The game opens on a title menu. Starting a new game asks for a name, creates the player, and puts a Health Potion and an Attack Boost in the inventory. After that `GameManager::Run()` is a small state machine: explore, then battle, then back to explore. After each win the game offers a shop, and you press Enter to go in or Esc to skip. A loss ends the run. The in-game text is in Korean.

Winning a fight gives experience and 10 to 20 gold, and each monster has a 30 percent chance to drop its item. Every 100 experience is a level, up to level 10. A level raises max health by 20 times the new level and attack by 5 times the new level, and refills health. At level 10 the next fight is the boss, and beating it ends the game with the credits.

## Combat

Combat is turn based, and each turn starts when the player presses Enter. There are two random parts:

- At the start of a turn there's a 30 percent chance the player uses a random item from the inventory. That's the "auto" part of the auto-battler.
- The attack itself is a timing gauge. A cursor sweeps back and forth across a bar, and a highlighted zone sits at a random spot, with a random cursor speed. Press Enter or Space as the cursor crosses it. The center cell is worth 1.2 times damage, and the cells around it drop to 0.9, 0.6, and 0.3. Anywhere else is a miss.

Damage is the player's attack times that multiplier, minus the monster's defense, with a minimum of 1. If the monster survives, it hits back for its attack value.

## Monsters

Monster stats live in one table: Goblin, Orc, Troll, Slime, and the Boss each have HP, attack, defense, avoid, an experience reward, and a drop. A factory function in `Create.cpp` picks a random type, builds the matching class, and sets its HP and attack to a random roll multiplied by the player's level. Adding a monster means adding a table row and a small class.

## How the code is organized

`GameManager`, `Character`, and `SoundManager` are singletons, which kept the rest of the code from passing them around, at the cost of hidden dependencies. Items implement an `IItem` interface with `GetName()` and `Use()`, and the inventory holds `unique_ptr<IItem>`, so a new item is one new class. Monster drops are an item built from the table's drop entry.

The console UI uses a few Windows-only pieces. `conio.h` gives `_getch()` and `_kbhit()` for key input without waiting for Enter, `system("cls")` clears the screen, and ANSI escape codes color the log. `UIManager` positions the cursor with `Gotoxy()`, draws each panel as a box, and has separate update functions for the stat, inventory, log, and kill list panels. Because of `conio.h`, the game builds on Windows only.

## Problems we hit

Every time someone added a file, we got `.vcxproj` merge conflicts. Moving the build to CMake (`CMakeLists.txt`) ended that. The CMake file collects every `.cpp` and `.h` under the project with `GLOB_RECURSE` and `CONFIGURE_DEPENDS`, so there's no file list for two people to edit at once. We also required approval from two teammates before merging, so nobody could push a risky change alone. Mixed-case branch names caused conflicts too, so we agreed on lowercase only.

In Rider, the working directory has to point at the project and "Run in external console" has to be on. The CMake toolchain is set to Visual Studio.

## Credits

The audio is free assets from itch.io: the Minifantasy Dungeon Audio Pack by Leohpaz and the 400 Sounds Pack by Chequered Ink. The files in the repo are for running the game only and shouldn't be redistributed.

[GitHub](https://github.com/devcol-main/TEAM8-Text-Console-RPG) · [YouTube](https://www.youtube.com/watch?v=NSOMsNnxaiw)
