---
title: "Movement and Level Metrics: Measuring Before Building"
description: "The player movement numbers PSEUDO's levels are built from, measured in a greybox gym map with injected input: walk, run, sprint and dash speeds, jump height and distance, coyote time, step height, walkable slopes, gap and ledge limits, fall damage. Plus the design rules derived from them: safe and skill gaps at 80 and 95 percent, a 50 cm grid, heights, slopes and corridor sizes."
publishAt: 2026-11-02
outline: deep
---

# Movement and Level Metrics: Measuring Before Building

Every gap, ledge and ramp in a level is a claim about what the player can do. If a gap is 20 cm wider than the best possible jump, it's a wall that looks like a challenge. If a ledge you're meant to climb needs a frame-perfect press, most players will think it's decoration. Level designers call the answer to this "metrics": the measured distances and heights the player's movement can cover, and the rules that turn them into geometry.

For PSEUDO I measured them instead of estimating them from settings. Jump distance isn't just speed times air time once air control, edge behavior, coyote time and the capsule's shape get involved. This page lists the numbers, how I got them, and the rules every greybox follows.

## The gym map

The measurements come from a dedicated map, `L_Gym_Metrics`, built entirely from engine cubes and labeled with text renders. A Python script generates it in the editor, so the lanes can be resized and rebuilt in place instead of edited by hand.

<figure>
  <img src="/blog/pseudo-level-metrics-1.png" alt="Overview of the gym map in the Unreal editor viewport: two rows of numbered gap lanes on the left from GAP 100 to GAP 800, a staircase of numbered blocks labeled HEIGHTS in the middle, a row of low STEPS, and a row of ramps labeled SLOPES on the right" loading="lazy">
  <figcaption>The whole gym: gap lanes on the left, heights and steps in the middle, slopes on the right. Everything sits on the same 50 cm grid the levels use.</figcaption>
</figure>

| Zone | Content |
|---|---|
| Gaps | Lanes 300 cm apart, a take-off platform and a 600 cm landing, top at 100 cm. Gaps from 100 to 800 in 50 cm steps, plus unlock lanes from 900 to 1500 in 100 cm steps |
| Heights | Blocks from 50 to 400 cm in 50 cm steps |
| Steps | Low blocks of 20, 30, 40, 45, 50 and 60 cm |
| Slopes | Ramps from 20 to 50 degrees in 5 degree steps, each a 400 cm run with a platform on top |
| Free floor | Open ground for flat run and jump measurements |

### How the numbers were taken

I didn't play the gym by hand and eyeball where I landed. The tests ran in Play In Editor (listen server, one player, 60 fps, enemies frozen) with input injected through Enhanced Input: the script presses move, jump and dash exactly when it's told to, and samples the character's position, velocity and movement mode every frame.

The trickiest definition was the **edge jump**: jump pressed on the first frame the character is falling after running off the platform. That's the most precise timing a human can manage, and coyote time makes it legal. A gap "passes" if the character ends on the landing platform.

<figure>
  <img src="/blog/pseudo-level-metrics-2.png" alt="Player view in Play In Editor: the character, carrying a greatsword on his back, stands at the take-off end of the gap lanes, with lane labels 750, 700, 650, 600 and 550 floating over the landing platforms ahead" loading="lazy">
  <figcaption>The gap lanes from the player's camera. The labels are the gap width in centimeters.</figcaption>
</figure>

Unlockable movement (double jump, air dash) was measured with a cheat that unlocks everything; the base numbers come from a fresh session without it.

## The measured numbers

### Body and ground movement

| Metric | Measured |
|---|---|
| Capsule | Radius 34, half height 88 (176 cm tall) |
| Walk (half stick) | 180 cm/s; speed scales with stick tilt, no minimum |
| Run (full stick) | 360 cm/s, reached in about 0.2 s |
| Sprint (hold Shift 0.2 s or more) | 600 cm/s; from a standstill, full speed after about 0.4 s and 1.3 m |
| Dash (tap Shift) | 450 cm in 0.35 s (peak 1286 cm/s), invulnerable for the whole 0.35 s, 0.6 s cooldown |
| Air dash (unlock) | 450 cm in 0.35 s with height held, once per jump |
| Max step height | 45 cm walks up, 50 blocks |
| Walkable slope | 40 degrees walks to the top, 45 blocks (limit 44.77) |

Shift does two things: a tap is a dash on release, a hold of 0.2 s or more is a sprint with no dash. An earlier version started every sprint with a dash, which made the run-up for a sprint jump hard to predict; splitting them made both easier to measure and to use.

### Jumps

| Metric | Measured |
|---|---|
| Single jump | Apex +127.5 cm at 0.51 s, air time 1.02 s |
| Double jump (unlock, second press at the apex) | Apex +255 cm, air time 1.75 s |
| Jump distance, flat ground | Walk 183, run 366, sprint 610 cm |
| Double jump distance, flat | Run 630, sprint 1040 to 1060 cm |
| Jump + air dash at the apex | Run 767, sprint 887 cm |
| Double jump + air dash | Run 1031, sprint 1273 to 1285 cm |

Jump height doesn't depend on how long you hold the button: the jump is a single fixed impulse (Jump Z Velocity 500, normal gravity). Air control is 0.6 and there's no lateral friction in the air, so sprint speed carries through the whole jump. The air control value has its own story in [Air Control 0.05](/blog/2026-10-16-pseudo-air-control).

### Edges and coyote time

Two numbers surprised me:

- **Coyote time is 0.15 s, but only about 0.11 s of it is usable.** When the character runs off a ledge, the capsule first rolls about 27 cm down over the edge while the game still considers it walking. That roll eats part of the window. A jump at 0.11 s after the first falling frame still fires; 0.12 to 0.13 s doesn't. A late coyote jump still buys reach: about 30 cm at run speed and 60 cm at sprint.
- **The character leaves a ledge 36 to 40 cm past the edge**, and has already dropped 13 to 17 cm when falling starts. That's the capsule radius plus the roll. It means the effective take-off point is beyond the visible edge, which helps gap distances a little.

### Limits

| Test | Passes | Fails |
|---|---|---|
| Highest ledge, single jump | 150 cm | 200 |
| Highest ledge, double jump | 250 cm | 300 |
| Max gap, run edge jump | 400 cm | 450 |
| Max gap, sprint edge jump | 650 cm (5 of 5) | 700 (failed 5 of 6) |
| Max gap, late coyote sprint jump | 700 cm | 750 |
| Max gap, sprint double jump (unlock) | 1100 cm | 1200 |
| Max gap, sprint double jump + air dash (unlock) | 1300 cm | 1400 |

The single-jump ledge is higher than the jump apex (150 against 127.5) because the capsule steps up onto a corner it barely reaches.

<figure>
  <img src="/blog/pseudo-level-metrics-3.png" alt="Close view of the heights row: blocks labeled H 50 through H 400 rising in a line, next to a row of low blocks labeled STEP 20 through STEP 60" loading="lazy">
  <figcaption>The heights and steps rows. H 150 is the tallest single-jump ledge; STEP 45 is the tallest you can walk up without jumping.</figcaption>
</figure>

### Falling and interacting

| Metric | Measured |
|---|---|
| Fall damage | None up to 500 cm, then linear up to 40% of max health at 1500 cm (capped) |
| Landing recovery | From 1000 cm |
| Break-fall | Press Jump within ±0.15 s of touching the ground on a landing that would hurt: no damage, no recovery |
| Interact range | 250 cm, nearest object in front; blocked if a living enemy is within 1000 cm |

Fall height is measured from the last apex, not from the take-off point, so a jump off a high ledge counts its full drop. Break-fall and Luck details are on the [Defense](/wiki/systems/defense) page.

## The design rules

All level geometry snaps to a **50 cm grid**: heights, gap widths, platform sizes. The gym uses the same grid, so every number above can be built exactly.

### Gaps

A gap is either **safe** or **skill**:

- **Safe gap = 80%** of the measured max. Everyone makes it, even with a sloppy press.
- **Skill gap = 95%** of the max. It needs a clean edge jump.

Both are rounded *down* to the grid. The critical path only uses base movement; gaps that need an unlock are for optional routes and secrets.

| Movement | Max | Safe | Skill | Never crossable |
|---|---|---|---|---|
| Run jump | 400 | 300 | 350 | 450 and up |
| Sprint jump | 650 | 500 | 600 | 700 and up |
| Sprint double jump (unlock) | 1100 | 850 | 1000 | 1200 and up |
| Sprint double jump + air dash (unlock) | 1300 | 1000 | 1200 | 1400 and up |

- A gap the player must not cross without an unlock is **750 or wider**, which beats even a perfect late coyote sprint jump. A gap nobody should cross is 1400 or wider.
- Sprint gaps need about 1.5 m of run-up with Shift held from a standstill. I give **3 m**, so a late press still reaches full speed.
- These numbers are for take-off and landing at the same height. A lower landing gives more air time, so the flat numbers are an upper bound only for level gaps.

### Heights

| Height | Use |
|---|---|
| 40 or less | Stairs and curbs you walk up (max step 45, keep 5 cm of margin; risers 20 to 40) |
| 50 | The lowest ledge that needs a jump |
| **100** | Safe single-jump ledge |
| 150 | Skill single-jump ledge (it looks like a stretch, and it is) |
| 200 and up | Blocks base movement: walls, cover you can't climb |
| **200** | Safe double-jump ledge (unlock routes) |
| 250 | Skill double-jump ledge |
| 300 and up | Blocks every jump |
| 450 or less | A free drop, no damage |
| 1000 and up | A drop with landing recovery; kept off the critical path |

### Slopes

<figure>
  <img src="/blog/pseudo-level-metrics-4.png" alt="Row of ramps labeled SLOPE 20 deg through SLOPE 50 deg, each steeper than the last, with flat platforms on top" loading="lazy">
  <figcaption>Slopes from 20 to 50 degrees. 40 is the steepest the character walks up; 45 slides it back down.</figcaption>
</figure>

- **35 degrees or less**: comfortable ramps; sprint keeps its speed.
- **40 degrees**: still walkable, but reads as steep. Used rarely.
- **45 degrees or more**: not walkable, the player slides off. Used for rock faces that say "you can't climb this", preferably 50 or more so it reads as a wall rather than a slope you almost made.

### Space

- The capsule is 68 cm wide and 176 cm tall. Corridors are at least **150 cm** wide (300 if there's fighting in them), doors **150 × 250**, and ceilings at least **300** wherever the camera follows, since the camera arm is 400 cm and pulls back further while sprinting (see [Camera](/wiki/systems/camera)).
- Interactables go within **250 cm** of where the player naturally stops, and living enemies stay more than 1000 cm away unless the object is meant to be used mid-fight.
- One dash covers 450 cm, so a hazard or area attack ring wider than that can't be crossed with a single dash. That's a tool for boss arenas, not an accident.

## Keeping it true

The table in the original design doc lists, for every number, the exact setting it comes from (`MaxWalkSpeed`, `JumpZVelocity`, `Max Step Height`, the combat settings for dash and sprint, and so on). Any change to one of those settings means re-running the gym and updating this page. A metric nobody re-measures is worse than none, because a level built on it will be wrong with confidence.
