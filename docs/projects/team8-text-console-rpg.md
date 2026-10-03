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

## Problems we hit

Every time someone added a file, we got `.vcxproj` merge conflicts. Moving the build to CMake (`CMakeLists.txt`) ended that. We also required approval from two teammates before merging, so nobody could push a risky change alone. Mixed-case branch names caused conflicts too, so we agreed on lowercase only.

In Rider, the working directory has to point at the project and "Run in external console" has to be on. The CMake toolchain is set to Visual Studio.

## Credits

The audio is free assets from itch.io: the Minifantasy Dungeon Audio Pack by Leohpaz and the 400 Sounds Pack by Chequered Ink. The files in the repo are for running the game only and shouldn't be redistributed.

[GitHub](https://github.com/devcol-main/TEAM8-Text-Console-RPG) · [YouTube](https://www.youtube.com/watch?v=NSOMsNnxaiw)
