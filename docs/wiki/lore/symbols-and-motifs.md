---
title: "Symbols and Motifs: Animals, Marks and Two Different Eyes"
description: "The visual vocabulary PSEUDO borrows from lucid-dreaming symbolism: the butterfly, snake, owl and cat, the spinning top, the spiral, the eye and the sigil, where each one appears in play, why they're drawn as glowing line art instead of 3D models, how the assets are sourced, and why the main character has one blue eye and one grey. No story spoilers."
publishAt: 2026-11-03
outline: deep
---

# Symbols and Motifs: Animals, Marks and Two Different Eyes

PSEUDO is about the line between a life and the game someone logs in to every day (the setup is in [World and Tone](/wiki/lore/world-and-tone)). I wanted that line to be visible without anyone ever explaining it. So the game borrows a small set of animals and marks that lucid-dreaming and dream-yoga communities use for "the boundary between waking and dreaming", and repeats them at the moments that matter.

This page lists them, where they show up, and the rules that keep them from turning into decoration. Like the rest of the Lore section, it stops before the story turns.

## Three rules

1. **Never explain, only repeat.** No codex entry, no tooltip, no character saying what the butterfly means. A symbol earns its meaning by appearing at the same kind of moment again and again: loading, a great roll, a cleared stage.
2. **Drawn, not modeled.** Every symbol is thin, glowing line art in the style of a sigil, rendered with Niagara particles and materials. No realistic 3D animals.
3. **Color is for meaning.** The interface (logo, menus, HUD frame) stays in one or two colors plus neutrals, in the ice-and-ink range. Strong color only appears when it carries information, and the signal set is three colors: ice, amber and ember. The point isn't the number of colors; it's that color shows up only when something happened.

### Why line art

Rule 2 started as a practical problem and turned into the look of the game. Realistic marketplace assets almost never include a believable owl or snake that fits a stylized symbol, and modeling, rigging and animating four animals is out of scope for a solo project. So I designed the game not to need them.

It turned out to be the better choice anyway. One drawn, glowing style ties every symbol together, and against a realistic world, a line-art butterfly reads clearly as *a sign*, not as wildlife that happens to be there. The contrast does part of the storytelling.

## The animals

| Animal | What it stands for | Where it appears |
|---|---|---|
| **Butterfly** | The boundary between dream and waking; metamorphosis; Zhuangzi's Butterfly Dream | Loading, stage clears, swarms on a great dice roll, the transition between hub and stage, perfect-combo streaks |
| **Snake** | Shedding skin, renewal, transformation | The Re-Roll effect: the die sheds its skin and rolls again. Possibly a shed-skin effect on boss phase changes |
| **Owl** | The eye that sees in the dark; wisdom; waking up | Statues in the hub (save point, shop); a flash in the eyes at the instant of a perfect dodge or parry; the scan effect that reveals a boss's weak spots |
| **Cat** | Intuition, independence, the unconscious, the unseen | The hub's mascot; hints at where hidden objects are; now and then, behavior that's slightly off |

The butterfly is the core and the only one I treat as essential. It has its own page with the full signal rules: [Butterflies: The Signal System](/wiki/lore/butterfly-signals).

The **snake on Re-Roll** is my favorite small detail. A re-roll is a second chance at the same throw, and a snake shedding its skin is the same body coming back renewed. The die doesn't just tumble again; it peels.

The **owl and the cat** are lower priority. If they make it in, the hub versions are statues rather than animated animals. A statue needs only a static mesh, fits the hub's idea of displaying trophies from bosses you've beaten, and, given a slight glow, reads as an object from inside the game rather than a real animal sitting on a shelf.

## The marks

| Mark | What it stands for | Where it appears |
|---|---|---|
| **Spinning top (totem)** | The object people carry to tell a dream from reality, as in *Inception* | A top on the desk in the hub, something the main character spins to check where he is |
| **Spiral / labyrinth** | Going down into the unconscious, finding the center, and coming back | Stage portals, the loading spinner, the effect while dice are rolling, the confuse and sleep debuffs, the layout of a later stage |
| **Eye / third eye** | Looking at the dream *consciously* | Lock-on and weak-point markers, an eye opening as the transition into a stage, the icon for the Real difficulty setting |
| **Sigil** | A personal mark used to fix or induce a dream state | The logo itself is drawn as a sigil; a sigil fragment for each cleared stage, assembled on the hub floor as a collectible |

The **spiral** does the most work after the butterfly, because it fits so many moments of play: falling into a stage, waiting for a load, watching dice tumble, and being confused or put to sleep by a Curse effect (see [Elements and Reactions](/wiki/systems/elements)). Wherever the game takes control away from you for a moment, there's a spiral.

The **eye** is the other half: wherever the game gives you clarity (a locked target, an exposed weak point), there's an eye.

## Where they appear

| Moment | What you see |
|---|---|
| Title and loading | Butterfly and spiral spinner; the logo drawn as a sigil |
| Hub | The spinning top on the desk; owl and cat statues |
| Rolling dice | A spiral effect, and a swarm of butterflies on a great result |
| Re-Roll | The die sheds its skin like a snake |
| Confuse or sleep | A spiral |
| A boss's weak point | An eye marker |
| A perfect-combo streak | Amber butterflies multiply with each perfect input and scatter when the streak resets |
| Stage clear | Butterflies |

## Two different eyes

The main character's eyes are different colors: **the right eye is grey, the left is blue.** This comes from the psychology of color in daydreams:

- **Blue** is the inner calm of escaping reality, and also the loneliness of being somewhere no one else is.
- **Black and white, no color,** is a dulled sense of reality, emotional numbness, or being stuck between choices.

A man who spends his days logging in to a game has both. So he gets both, one per eye.

On the technical side this is simple: the MetaHuman Creator lets you set the left and right eye materials separately, so it's two settings in the face's material panel.

The blue is the same blue that stands for calm in the butterfly color notes, so the eyes and the signal system sit on the same axis. And like everything else on this page, the eyes are never mentioned in the game. Some players will notice. Some will wonder why. That's as far as it goes.

## Sourcing

- **Butterflies** are Niagara sprites and mesh particles. They appear more than anything else, so they get the most polish.
- **Owl, snake and cat** are single-color 2D silhouettes used as material masks and Niagara sprites. Sources are open-license icon sets (for example game-icons.net, CC BY 3.0, which requires credit), cleaned-up generated images, or vectors I draw myself. Every source gets its license checked for commercial use and credit requirements before it goes in.
- **Hub statues** are static meshes with a glow material, no animation.

## Priorities

The butterfly signals, the spiral, the eye, the spinning top and the Re-Roll shed are the set I consider part of the game's identity. The owl, the cat, the snake on boss phases and the sigil collection are extras that go in if there's time. If they don't, the symbols that remain still say the same thing; they just say it a little less often.
