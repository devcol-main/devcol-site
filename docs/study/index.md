---
title: Study
---

# Study

Notes from learning Unreal Engine, C++, and the tools around them. Most of these started as something that wasn't obvious the first time I ran into it.

## Unreal Engine

- [Designing Item Classes Around an Interface](/study/interface-based-item-class-design): a C++ interface for pickups, and why I kept it small.
- [Picking Up Items on Collision](/study/collision-based-item-pickup): connecting overlap events to the interface.
- [Item Spawning and Level Data Management](/study/item-spawning-and-level-data-management): random spawns and drop rates from a data table.
- [Character Health and Score Management](/study/character-health-and-score-management): why health sits on the character and score sits on GameState.
- [Controlling Game Flow with a Game Loop](/study/game-loop-and-flow-control): GameMode versus GameState for a level loop.
- [Putting the Ability System Component on the PlayerState](/study/ability-system-component-on-the-player-state): owner vs avatar, initializing on both sides, and keeping state across pawn swaps.
- [One Character Class, Two Roles: Pawn Data and Input Tags](/study/pawn-data-and-input-tags): one pawn class driven by a data asset, with input routed through gameplay tags.
- [Numbers in Spreadsheets, References in Data Assets](/study/csv-datatables-vs-data-assets): CSV DataTables for numbers, DataAssets for structure, joined by row IDs.
- [Hard vs Soft References in Gameplay Data Assets](/study/hard-vs-soft-references-for-data-assets): what each reference loads, and who should own the load.

## Git

- [Managing Unreal Engine Projects with Git LFS](/study/git-lfs-for-unreal-engine-projects): keeping large binary assets from bloating the repo.
- [Embedding GIFs and Images in a GitHub README](/study/github-readme-gifs-and-images): sizing and centering media in a README.
