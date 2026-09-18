---
title: Study
---

# Study

Notes from learning Unreal Engine, C++, and the tooling around them — written up as things get figured out, not as a reference manual. If it's here, it's usually because something wasn't obvious the first time or worth remembering later.

## Unreal Engine

- **[Designing Item Classes Around an Interface](/study/interface-based-item-class-design)** — a C++ interface for pickups, and a rule of thumb for not over-building it.
- **[Picking Up Items on Collision](/study/collision-based-item-pickup)** — wiring collision-based pickup logic into the interface.
- **[Item Spawning and Level Data Management](/study/item-spawning-and-level-data-management)** — spawning items across three difficulty-tiered levels.
- **[Character Health and Score Management](/study/character-health-and-score-management)** — why health and score live on the character instead of PlayerState, for now.
- **[Controlling Game Flow with a Game Loop](/study/game-loop-and-flow-control)** — GameMode vs. GameState, and where each one's responsibilities start.

## Git

- **[Managing Unreal Engine Projects with Git LFS](/study/git-lfs-for-unreal-engine-projects)** — keeping large binary assets out of a bloated repo history.
- **[Embedding GIFs and Images in a GitHub README](/study/github-readme-gifs-and-images)** — linking media that lives in your own repo, not someone else's.
