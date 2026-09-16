---
title: TEAM8-Text-Console-RPG
outline: deep
---

# TEAM8-Text-Console-RPG

*C++*

An auto-battler text RPG built with a small team, focused on capturing the nostalgic feel of a text-based RPG.

![TEAM8-Text-Console-RPG split-screen gameplay](/projects/team8-text-console-rpg-1.jpg)

## Key features

- A split-screen layout in a single window, showing multiple streams of information at a glance.
- Subsystems (Item, Inventory, Character, Monster, UI, Shop, Sound) organized around a central GameManager.

## Gameplay & demonstration video

<div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden; max-width: 100%;">
<iframe src="https://www.youtube.com/embed/NSOMsNnxaiw" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;" frameborder="0" allowfullscreen></iframe>
</div>

## Development process

Roles were split based on a Notion diagram drawn up ahead of time. A UIManager was introduced once game logs and UI elements needed their own home, and combat logic was extracted from GameManager into a dedicated BattleManager to keep things manageable.

## Troubleshooting

- Frequent `.vcxproj` conflicts on new files were solved by migrating the build system to CMake (`CMakeLists.txt`).
- A branch rule requiring 2 peer approvals was added to prevent risky solo merges.
- Branch name case-sensitivity was causing conflicts — settled on strictly lowercase branch names.

## Environment

Rider was configured with the working directory set to the project path and "Run in external console" enabled; CMake's toolchain was set to Visual Studio.

## Audio credits

Uses free assets from itch.io creators — the Minifantasy Dungeon Audio Pack by Leohpaz and the 400 Sounds Pack by Chequered Ink. Assets are for in-game use only, not redistribution.

## Links

[GitHub](https://github.com/devcol-main/TEAM8-Text-Console-RPG) · [YouTube](https://www.youtube.com/watch?v=NSOMsNnxaiw)
