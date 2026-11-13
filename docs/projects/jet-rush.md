---
title: Jet Rush
description: "A third-person endless flying runner you can play in the browser. Controls, the two maps, scoring, obstacles, the difficulty curve, and how the world generator guarantees a path, with the core code. Built with TypeScript, Canvas 2D, and WebAudio."
outline: deep
---

# Jet Rush

*Arcade Web · TypeScript, Canvas 2D, WebAudio* · [Play Jet Rush](/arcade/jet-rush)

Jet Rush is an endless flying runner seen from behind the plane. Your jet flies forward on its own through a sun-bleached city of sand-coloured boxes. You steer left and right, climb and dive, and hold boost to go faster, threading the gaps between the boxes and flying through rings for bonus points. The further you get, the faster you fly and the tighter the gaps become. One touch of a box, the ground, or (on the default map) a side wall ends the run.

The rules and feel are inspired by the Jet Rush game on CrazyGames. Everything here (art, sound and code) was written from scratch apart from the Rajdhani font, and the 3D look comes from a hand-written projection drawn with Canvas 2D, without a game engine.

<figure>
  <img src="/projects/jet-rush-gameplay.png" alt="Jet Rush on a phone: a red jet flying low between sand-coloured boxes, with the score panel at the top and the keyboard controls strip at the bottom" width="300" loading="lazy">
  <figcaption>The start of a run. The panel shows the score, the best score, and the distance flown next to the best distance. The strip at the bottom lists the keys for the first four seconds of each run.</figcaption>
</figure>

## How to play

### Keyboard

| Key | Action |
|---|---|
| `←` `→` or `A` `D` | Move left or right (hold) |
| `S`, `Space` or `↓` | Up: raise the nose and climb (hold) |
| `W` or `↑` | Down: lower the nose and dive (hold) |
| `Shift` (left or right) | Boost (hold): faster, and distance scores 2× |
| `Space`, `Enter` or a click | Start on the title screen, retry after a game over |
| `M` | Mute or unmute everything |
| `Esc` | Close the Options panel |

Up and down follow a flight stick: pulling back (`S` or `↓`) lifts the nose, pushing forward (`W` or `↑`) drops it. `Space` only climbs during a run. On the title and game over screens it starts a new one. Let go of both keys and the jet holds its altitude while the nose levels out.

The game runs in a frame on the site, so the keyboard only reaches it after you click it once. On keyboard devices a strip at the bottom of the screen lists the controls for the first 4 seconds of every run and then fades out.

### Touch

- Touch and hold the left or right half of the screen to move left or right.
- The `UP`, `DOWN` and `BOOST` buttons show up during play on touch devices only. By default `DOWN` sits at the bottom left, `BOOST` at the bottom centre and `UP` at the bottom right, so one thumb can steer while the other climbs, dives or boosts.
- **Options → Touch buttons → Edit** lets you drag each button to a new place. Portrait and landscape layouts are saved separately, and `Reset` puts the current orientation back to the defaults.

On your first run, short hints appear under the score one at a time (move, up, down, boost) and go away once you do what they say.

### Options

The Options button has switches and volumes for sound, music and sound effects, a reduced motion setting, vibration on devices that support it, the map choice, a controls table, and a two-step reset of your Jet Rush records.

## Rules

- The jet always flies forward. Steering is continuous, with no lanes, and the jet banks into turns.
- Hitting a box ends the run. So does touching the ground or, on the Lanes map, one of the side walls. A shield does not save you from the ground or a wall.
- Each run starts at 3.5 m, the height of the middle rings. You can climb to 7.5 m, just under the 8 m side walls. Up there you clear the low slabs, the moving platforms and the 3 m blocks, but towers are 7.6 to 12 m tall and always block you.
- Rings float at one of three heights: low (0.9 m), middle (3.5 m) or high (6 m). To catch one, the jet has to pass through it at its height. At the ceiling you miss every ring, so you have to come down to collect them.

## The two maps

- **Lanes** (the default) is a 25 m wide track with walls on both sides. Touching a wall ends the run.
- **Open** has no walls. The track repeats to the left and right without end, and every 25 m wide strip is its own track with its own guaranteed path. Flying past a ring in a strip you are not in does not break your ring combo. Only a missed ring in your own strip does.

Open is locked at first. It unlocks once your best flight distance reaches 1000 m on either map. Until then the `OPEN` button on the title screen is dimmed with a lock and the hint `Fly 1000 m to unlock`. The run that first passes 1000 m ends with `OPEN MAP UNLOCKED` on the game over screen, and you can pick Open from the next run. Pick the map with the `LANES` and `OPEN` buttons above `Tap to start`, or under **Map** in Options. Your choice is saved.

Both maps share one best score, one best flight distance and one leaderboard. Both also start at the middle height. The guaranteed path is measured at the low height of 0.9 m, so sometimes you have to dive to use it.

## Scoring

- **Distance**: 1 point per metre flown. While you hold boost, every metre counts twice. The doubling follows the button, so it starts the moment you press it, even before the jet has reached full boost speed.
- **Blue rings** give a ring bonus that grows with your ring combo (below). Boost does not double ring bonuses.
- Your score is the distance points (rounded down) plus all ring bonuses. The panel at the top also shows the distance actually flown and your best flight distance, for example `523 m · BEST 1820 m`. Beat your best score and `NEW RECORD!` appears.

### Ring combo

Every ring you pass in a row raises the combo, and the bonus grows by 250 per ring up to a cap of 1,500:

| Ring in a row | Bonus |
|---|---|
| 1st | 500 |
| 2nd | 750 |
| 3rd | 1,000 |
| 4th | 1,250 |
| 5th and later | 1,500 |

The banner shows `BONUS +750 · COMBO x2` once the combo reaches 2. Missing a ring, blue or green, resets the combo to 0. A ring is caught when the centre of the jet passes within 1.05 m of the ring's centre (a 1.3 m radius minus a 0.25 m margin), measured both sideways and in height.

### Shields

From 300 m on, each ring has a 25% chance to be **green**. A green ring gives a shield that lets you fly through one box. The box breaks apart and the shield is used up. If you touch two boxes at the same instant, the one shield breaks both. A green ring scores no points itself but still counts toward the combo, so the next blue ring is worth more. If you already have a shield, a green ring counts as a blue one and pays the normal bonus.

## Obstacles

The first 60 m of every run are empty. After that the track is a grid of 10 columns, 2.5 m each, and every 2.5 m of track is one row of boxes.

| Obstacle | Size | From | What it does |
|---|---|---|---|
| Slab | 1.2 m tall | 60 m | Low box on the ground |
| Block | 3 m tall | 60 m | Medium box. Also forms corridor and gate walls |
| Tower | 7.6 to 12 m tall | 60 m | Taller than the ceiling, so it always blocks |
| Floating box | 1 to 2.5 m thick, bottom 2.2 to 6.5 m up | 100 m | Hangs in the air. 1 to 3 per row, 1 to 3 columns wide, top never above 9 m |
| Slider | 3 m tall | 250 m | Swings sideways across 2 to 4 columns every 3.2 s |
| Rising platform | 0 to 1.5 m | 300 m | Rises and falls on a 2.4 s cycle |
| Dropper | 1.5 m thick | 400 m | Drops from 6.5 m to the ground and back every 3 s |
| Charger | 3 m tall | 600 m | Starts rushing toward you at 10 m/s once you are within 45 m, for up to 12 m |

Of the floating boxes, 60% have their bottom between 4.5 and 6.5 m and the rest between 2.2 and 4.5 m, and a third box in the same row is only placed at 4.5 m or higher. That high layer is there so the top of the sky isn't a free lane. A floating box above a ground box always leaves at least 1 m between them. Moving obstacles are drawn with a darker outline on every visible edge, except the rising platforms, which keep a light top edge.

### Sections

The track is built from sections. Each one has a pattern, picked at random with these weights once its distance is reached:

| Section | Length | Contents | From | Weight |
|---|---|---|---|---|
| Open | 6 to 12 rows | Random slabs, blocks and towers, and now and then a moving obstacle (3% of rows) | Start | 3 |
| Corridor | 6 to 10 rows | Walls of blocks and towers everywhere except a gap around the path | 100 m | 2 |
| Gate | 5 rows | One full row of blocks with a gap, and two rows with no ground boxes before and after it | 200 m | 1.5 |
| Movers | 4 to 8 rows | Like open, plus a moving obstacle in each column beside the path (70% chance each) | 300 m | 2 |
| Slalom | 8 to 14 rows | A diagonal channel 3 columns wide that steps one column sideways every 3 rows | 350 m | 1.5 |

In movers sections the kind of moving obstacle is drawn by weight: rising platform 3, slider 2, dropper 3, charger 3, counting only the kinds whose distance has been reached.

## Speed and difficulty

Everything gets harder with distance, never with time:

| | Start | Change | Limit |
|---|---|---|---|
| Speed | 24 m/s | +1 m/s every 45 m | 68 m/s, reached at 1,980 m |
| Box density (open rows) | 18% of cells | rises in a straight line | 42% at 2,500 m |
| Towers among non-slab boxes | 20% | rises in a straight line | 40% at 2,500 m |
| Corridor and gate gap | 3 columns | 2 columns from 500 m | 1 column from 1,400 m |
| Rows with floating boxes | 30% | rises in a straight line | 60% at 2,000 m |

Boost multiplies the current speed by up to 1.35, so the top speed with boost is about 92 m/s. It ramps in over 0.35 s when you press it and out over 0.5 s when you let go. Boost does not change the world, so it is a pure trade: the same track, less time to react, twice the distance points.

Sideways speed tops out at 0.55 times the forward speed and is reached in 0.15 s. Because it scales with the forward speed, the jet can always move about 1.4 m sideways (0.55 of a column) per row of track at any speed. The shape of the path that can be flown stays the same, and only the time you have to react shrinks. Climbing and diving top out at 6 m/s whatever the speed.

## How the world is generated

The world is built row by row, 140 m ahead of the jet, and rows more than 20 m behind it go back into a pool to be reused. Nothing about the layout is hand-made, so the generator has to promise one thing on its own: there is always a way through.

### A safe column in every row

Every row has a **safe column**, a column where no ground box is ever placed. It stays between the second and the second-to-last column, and it only ever moves one column at a time. Rings are always placed in the centre of the safe column.

Moving the safe column is the risky part. If the open cell jumped sideways faster than the jet can follow, the run would become impossible. So each move gets a **transition window** measured in time. The window is as many rows as the jet crosses in 0.5 s at that point's speed (at least 2): 5 rows at 24 m/s, 14 rows at 68 m/s. During that window:

- for the window's length, starting at the row where it moves, the old column and the new column are both kept clear,
- the new column is also cleared in advance for the same number of rows before the move, so you can see the opening coming and drift into it early,
- and the column can't move again until the window is over.

On top of that, the safe column never moves on a ring's row or the row before it, a move is cancelled if its early-cleared rows would cross a ring or a gate wall, and a move is also cancelled if its window would run into a gate wall further on (the gate would lose its wall). Outside slalom sections an eligible row moves the column with a 25% chance. Slalom sections move it every 3 rows in a fixed direction and turn around at the edge. Every 2 rows would need 91% of the jet's top sideways speed, which is too much to ask of a person.

These are the speed curve, the gap steps and the window size, as they sit in the config file:

::: details Show code · src/core/config.ts
```ts
// src/core/config.ts (comments translated from Korean)
/** Corridor/gate gap (columns). Steps: gapStart -> gapMid (from 500 m) -> gapEnd (from 1400 m). */
export function gapAt(c: JetRushConfig, distance: number): number {
  if (distance >= c.gapEndFromMeters) return c.gapEnd;
  if (distance >= c.gapMidFromMeters) return c.gapMid;
  return c.gapStart;
}

/** Forward speed at this distance (m/s). */
export function speedAt(c: JetRushConfig, distance: number): number {
  const d = distance > 0 ? distance : 0;
  return Math.min(c.speedStart + d / c.metersPerSpeedUp, c.speedMax);
}

/**
 * Row count of a safe column transition window. z is the z0 of the row where the shift happens (m).
 * From the shifting row, this many rows keep both the old and the new column clear; the same number of rows
 * before it clear the new column in advance; and the column does not shift again for this many rows.
 * 24 m/s -> 5 rows, 68 m/s -> 14 rows.
 */
export function shiftRowsAt(c: JetRushConfig, z: number): number {
  return Math.max(c.shiftClearRowsMin, Math.ceil((speedAt(c, z) * c.shiftWindowSec) / c.cell));
}
```
:::

To clear cells *before* a move, the generator has to know about the move before it builds those rows. So it runs in two passes. A planning pass decides the section, the safe column, the cells to clear and the rings, and it always runs at least 14 rows ahead of the pass that actually fills cells with boxes. When a move is planned, it reaches back and marks the new column in the rows it already planned:

::: details Show code · src/core/worldGen.ts (planning a row)
```ts
// src/core/worldGen.ts, WorldGen.planRow (abridged, comments translated)
// 1) Decide whether the safe column moves
p.clearMask = 0;
let shifted = false;
if (this.pattern !== 'gate') {
  const slalom = this.pattern === 'slalom';
  const rows = shiftRowsAt(c, z0);
  // Rings sit in the safe column, so moving it on a ring row or the row before would make the ring unreachable.
  const ringNear = row === this.nextRingRow || row + 1 === this.nextRingRow;
  let canShift = !ringNear && row >= (slalom ? this.shiftSoftEnd : this.shiftFullEnd);
  // Don't shift if the rows cleared in advance (row - rows .. row - 1) hold a gate wall or a ring.
  if (canShift && !slalom) canShift = row - rows > this.lastGateWallRow && row - rows > this.lastRingRow;
  // The other side: don't shift if this window (row .. row + rows - 1) reaches a gate wall row further on.
  if (canShift && this.gateWallWithin(row, row + rows)) canShift = false;
  if (canShift) {
    const want = slalom ? true : this.rng() < c.shiftChance;
    if (want) {
      let dir: 1 | -1;
      // ... slalom keeps its direction, other sections pick left or right; both turn around at the edge
      const oldCol = this.safeCol;
      this.safeCol += dir;
      shifted = true;
      this.windowMask = (1 << oldCol) | (1 << this.safeCol);
      this.windowFullEnd = row + rows;
      this.windowSoftEnd = slalom ? row + c.slalomShiftRows : row + rows;
      this.shiftFullEnd = this.windowFullEnd;
      this.shiftSoftEnd = this.windowSoftEnd;
      if (!slalom) {
        const bit = 1 << this.safeCol;
        for (let r = Math.max(row - rows, 0); r < row; r++) this.plans[r % this.plans.length]!.clearMask |= bit;
      }
    }
  }
}
if (row < this.windowFullEnd && (this.pattern !== 'slalom' || row < this.windowSoftEnd)) {
  p.clearMask |= this.windowMask;
}
```
:::

The filling pass lets each section place its boxes however it likes and then wipes the cells the plan says must stay empty. That order means no section pattern can break the path, whatever it does:

::: details Show code · src/core/worldGen.ts (clearing the path)
```ts
// src/core/worldGen.ts, WorldGen.generateRow (abridged, comments translated)
switch (p.pattern) {
  case 'open':
    this.fillOpen(z0);
    this.fillOpenMoving(p, z0);
    break;
  // ... corridor, gate, slalom
  case 'movers':
    this.fillOpen(z0);
    this.fillMovers(p, z0);
    break;
}

// Cells that must stay empty: the safe column, the old and new columns of a transition window,
// and the new column cleared in advance.
this.cellKind[p.safeCol] = CELL_NONE;
if (p.clearMask !== 0) {
  for (let col = 0; col < c.cols; col++) if ((p.clearMask & (1 << col)) !== 0) this.cellKind[col] = CELL_NONE;
}
// The start stretch is all empty.
if (z0 < c.startClearMeters) this.cellKind.fill(CELL_NONE);
```
:::

A test checks the promise directly. For five seeds it builds 5,000 rows each and tracks every position a pilot could be in, at quarter-column resolution, moving at most half a column per row (a little less than the jet's 0.55). If that set of reachable positions is ever empty, the test fails.

### A low path and a high path

The safe column guarantees a path along the ground, at the low height of 0.9 m. Floating boxes and moving obstacles would break that guarantee, so they follow two extra rules.

- Floating boxes always have their bottom at 2.2 m or higher. The jet flying the low path has its top at 1.25 m, so it passes under every one of them. That is why floating boxes may hang over the safe column.
- No moving obstacle may ever enter, at any moment of its movement, the low part of a cell that must stay clear. A slider's whole sweep has to avoid those cells. A dropper reaches the ground, so it is never placed in one. A charger travels back through earlier rows, so its column has to be free in every row it will pass, and boxes in its way are trimmed. If an obstacle can't satisfy the rule, it is simply not placed.

::: details Show code · src/core/worldGen.ts (placing moving obstacles)
```ts
// src/core/worldGen.ts, WorldGen.tryPlaceMoving (abridged, comments translated)
private tryPlaceMoving(kind: number, col: number, dir: number, p: PlanRow): void {
  const c = this.config;
  const cols = c.cols;
  if (kind === MOVE_NONE || col < 0 || col >= cols || this.cellReserved[col] !== 0) return;
  const clear = p.clearMask | (1 << p.safeCol);
  switch (kind) {
    // ... rising platform
    case MOVE_SLIDER: {
      // How many cells in direction dir don't have to stay clear.
      let free = 0;
      while (free < c.sliderRangeMax) {
        const k = col + dir * free;
        if (k < 0 || k >= cols || (clear & (1 << k)) !== 0 || this.cellReserved[k] !== 0) break;
        free++;
      }
      if (free < Math.max(c.sliderRangeMin, 2)) return;
      const range = Math.min(this.randInt(c.sliderRangeMin, c.sliderRangeMax), free);
      const lo = dir > 0 ? col : col - range + 1;
      for (let k = lo; k < lo + range; k++) {
        this.cellReserved[k] = 1;
        this.cellKind[k] = CELL_NONE; // no other box in the cells it sweeps
      }
      this.addPending(MOVE_SLIDER, lo, range, this.rng() * Math.PI * 2);
      return;
    }
    case MOVE_DROPPER: {
      if ((clear & (1 << col)) !== 0) return;
      // It comes down to the ground, so never in a ring approach column (same rule as floating boxes).
      this.collectApproaches(p.row);
      for (let i = 0; i < this.approachCount; i++) if (this.approachCol[i] === col) return;
      this.cellReserved[col] = 1;
      this.cellKind[col] = CELL_NONE; // it reaches the ground, so no ground box under it
      this.addPending(MOVE_DROPPER, col, 1, this.rng() * Math.PI * 2);
      return;
    }
    // ... charger: checks and trims every row it will travel back through
  }
}
```
:::

Higher up the picture changes. Slabs, rising platforms and blocks all stay below 3 m, so from the middle height up only towers, floating boxes and droppers stand in your way. The air above the ground boxes is a second route, and the high layer of floating boxes (most of them with their bottom between 4.5 and 6.5 m) is what keeps it from being a free ride.

### Room to reach a ring

A high ring needs a clear way up. For the last 10 rows (25 m) before a ring and the row after it, no floating box may overlap the ring's column in a height band from the ring's centre minus 1.8 m to its centre plus 1.8 m (the 1.3 m radius plus 0.5 m). Droppers are kept out of those columns entirely. The ground in the safe column is empty anyway, so there is always a clear climb or dive to the ring. Because the planning pass runs ahead, the generator already knows where the next ring will be when it fills the rows in front of it:

::: details Show code · src/core/worldGen.ts (ring approaches)
```ts
// src/core/worldGen.ts (comments translated)
/**
 * Collects the ring approaches that cross this row. A floating box in row R must keep
 * [ring.y - radius - margin, ring.y + radius + margin] clear in the ring's column when the ring row Q
 * is in R - 1 .. R + ringApproachRows. Planning runs lag (>= ringApproachRows) rows ahead of filling,
 * so the ring at R + ringApproachRows is already decided.
 */
private collectApproaches(row: number): void {
  const c = this.config;
  this.approachCount = 0;
  const reach = c.ringRadius + c.ringApproachMargin;
  for (let q = Math.max(row - 1, 0); q <= row + c.ringApproachRows; q++) {
    const pq = this.plans[q % this.plans.length]!;
    if (pq.row !== q) throw new Error(`plan for row ${q} is missing (found row ${pq.row}) while filling row ${row}`);
    if (pq.ring === RING_NONE) continue;
    const n = this.approachCount++;
    this.approachCol[n] = pq.safeCol;
    this.approachLo[n] = pq.ringY - reach;
    this.approachHi[n] = pq.ringY + reach;
  }
}

/** Can a floating box with vertical range [y0, top] go in column col (gap above ground boxes, ring approaches)? */
private floaterCellFree(col: number, y0: number, top: number): boolean {
  if (this.cellTaken[col] !== 0) return false;
  const below = this.cellTop[col]!;
  if (below > 0 && y0 < below + this.config.floaterGapAboveBox) return false;
  for (let i = 0; i < this.approachCount; i++) {
    if (this.approachCol[i] === col && y0 < this.approachHi[i]! && top > this.approachLo[i]!) return false;
  }
  return true;
}
```
:::

Rings come every 200 m, shifted by up to 40 m either way, and the height is drawn with weights: low 50%, middle 30%, high 20%.

### Same seed, same world

All randomness comes from a seeded generator (mulberry32, the same few lines Stack Up uses) that is passed into the core, and time comes in as a step length. The same seed and the same inputs always produce the same world and the same run. On the site the seed is the current time, so every page load flies a new city. During development `?seed=7` pins it, which makes a bug report reproducible and lets the tests replay exact runs.

### The Open map: strips side by side

The Open map reuses all of the rules above without changing them. The world is a row of 25 m wide strips (bands, in the code). Each strip runs its own copy of the Lanes generator, so each one has its own safe column, transition windows and ring approaches. Strip 0, where you start, uses the same random stream as Lanes, so with the same seed it is exactly the Lanes world. Every other strip gets its own seed, hashed from the run's seed, the game number within the session, and the strip's index:

::: details Show code · src/core/rng.ts
```ts
// src/core/rng.ts (comments translated)
function fmix32(h: number): number {
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  h = Math.imul(h, 0xc2b2ae35);
  h ^= h >>> 16;
  return h >>> 0;
}

/**
 * WorldGen seed for Open strip k (≠ 0): a hash of the run seed, which game of the run this is (gameIndex),
 * and the strip number. The same three values always give the same seed, so a strip that is dropped
 * and rebuilt has the same shape. Strip 0 does not use this seed (it shares the Lanes random stream).
 */
export function bandSeed(runSeed: number, gameIndex: number, band: number): number {
  let h = fmix32(runSeed >>> 0);
  h = fmix32(h ^ Math.imul(gameIndex | 0, 0x9e3779b1));
  h = fmix32(h ^ Math.imul(band | 0, 0x27d4eb2f));
  return h;
}
```
:::

Only the strip you are in and two on each side are kept and drawn. A strip three away is built in advance, 400 rows per step so a late-game strip doesn't arrive all in one frame, and strips further out are dropped. Because a strip's seed depends only on those three numbers, a strip you fly back to is rebuilt exactly as it was. Collisions only look at the one or two strips the jet overlaps. The path guarantee holds inside each strip. Crossing from one strip to the next is your own choice and isn't guaranteed to be open.

## Flight and collisions in code

The rules live in `JetRushLogic`, a plain TypeScript class with no DOM, canvas or audio in it. It takes the steering, pitch and boost input plus `update(dt)`, and reports what happened as events: a ring, a shield break, a game over. Rendering, sound and the screens all react to those events.

### Sub-steps

A slow frame is capped at 0.05 s, and at 92 m/s that is 4.6 m of travel. That is longer than a box (2.5 m) and the jet (1.8 m) put together, so one big step could jump straight past a box. `update` therefore cuts each frame into sub-steps of at most 1.25 m (half a cell). When boost is ramping up, the step is sized for the speed the jet will have reached by the end of it:

::: details Show code · src/core/JetRushLogic.ts (update)
```ts
// src/core/JetRushLogic.ts (comments translated)
update(dt: number): void {
  if (this.isGameOver || !(dt > 0)) return;
  const maxStepMeters = this.config.cell * this.config.subStepRatio;
  let remaining = dt;
  while (remaining > MIN_SUBSTEP_SEC && !this.isGameOver) {
    const base = speedAt(this.config, this.z);
    // First pass: h0 at the current boostLevel. Sizing again with the boostLevel reached during that time
    // keeps the step distance under the limit.
    const h0 = maxStepMeters / (base * this.boostMultiplier());
    const rampedLevel = this.boosting ? Math.min(1, this.boostLevel + h0 / this.config.boostRampUpSec) : this.boostLevel;
    let h = maxStepMeters / (base * this.boostMultiplier(rampedLevel));
    if (h > remaining) h = remaining;
    this.step(h);
    remaining -= h;
  }
}
```
:::

Each sub-step moves the jet and updates the score. Sideways and vertical speed both chase a target at a fixed acceleration, so letting go of a key brings the jet to a stop on that axis instead of letting it drift. Distance points are added at twice the rate while the boost button is held:

::: details Show code · src/core/JetRushLogic.ts (step)
```ts
// src/core/JetRushLogic.ts, JetRushLogic.step (abridged, comments translated)
const sp = speedAt(c, this.z) * this.boostMultiplier();

// Sideways velocity approaches the target at a constant acceleration (target 0 with no input).
// Top speed and acceleration follow the actual forward speed.
const lateralMax = c.lateralRatio * sp;
const target = this.steer * lateralMax;
const dv = (lateralMax / c.lateralAccelSec) * h;
if (this.vx < target) this.vx = Math.min(target, this.vx + dv);
else if (this.vx > target) this.vx = Math.max(target, this.vx - dv);

// ... vertical velocity, the same way: with no input it goes to 0 and the jet holds its altitude

const prevZ = this.z;
this.x += this.vx * h;
this.y += this.vy * h;
if (this.y > c.jetYMax) {
  this.y = c.jetYMax;
  if (this.vy > 0) this.vy = 0;
}
const dz = sp * h;
this.z += dz;
this.scoreMeters += this.boosting ? dz * c.scoreBoostMul : dz;
this.timeSec += h;
this.distance = Math.floor(this.z);

// ... keep every strip's rows generated, start chargers that are now within range

this.checkRings(prevZ);
this.score = Math.floor(this.scoreMeters) + this.bonusTotal;
if (this.checkBounds()) return;
this.checkCollisions();
```
:::

### Rings and the combo

A ring is checked in the sub-step where the jet crosses its z position. Inside the catch radius it is collected. Outside it, the combo resets, but on the Open map only when the ring is in the strip the jet is flying in:

::: details Show code · src/core/JetRushLogic.ts (rings)
```ts
// src/core/JetRushLogic.ts, checkRings and collect (abridged, comments translated)
// A miss (combo reset) only counts while the jet is inside that ring's strip. Rings in other strips can only be collected.
const countsMiss = !open || band.index === jetBand;
for (let i = 0; i < rings.length; i++) {
  const ring = rings[i]!;
  if (ring.collected || ring.z <= prevZ || ring.z > this.z || ring.z <= band.createdZ) continue;
  const dx = this.x - (ring.x + off);
  const dy = this.y - ring.y;
  if (dx * dx + dy * dy >= reach2) {
    if (countsMiss) this.ringCombo = 0; // passed the ring's z without collecting it
    continue;
  }
  this.collect(ring, off);
}

private collect(ring: Ring, offsetX: number): void {
  ring.collected = true;
  this.rings++;
  this.ringCombo++;
  // If the jet already has a shield, a shield ring counts as a bonus ring.
  const kind: RingKind = ring.kind === 'shield' && !this.hasShield ? 'shield' : 'bonus';
  let gained = 0;
  if (kind === 'shield') {
    this.hasShield = true;
  } else {
    const c = this.config;
    gained = Math.min(c.ringBonus + (this.ringCombo - 1) * c.ringComboStep, c.ringBonusMax);
    this.bonusTotal += gained;
    this.score = Math.floor(this.scoreMeters) + this.bonusTotal;
  }
  // ... queue a ring event for the view, audio and HUD
}
```
:::

### Boxes and the shield

Every box, moving or not, goes through one function that returns its bounds at a given time, so collisions and drawing always agree on where a box is. A hit needs an overlap on all three axes. That height check is what lets you pass under a floating box or over a block. Chargers move toward the jet, so the check also looks a few rows ahead for them:

::: details Show code · src/core/JetRushLogic.ts (collisions)
```ts
// src/core/JetRushLogic.ts, JetRushLogic.collideBand (abridged, comments translated)
// Chargers move from their row toward the jet (-z), so chargers up to chargerAheadRows rows ahead are checked too.
for (let row = rowLo; row <= rowHi + this.chargerAheadRows; row++) {
  const wr = world.rowAt(row);
  if (wr === null) continue;
  const jetRow = row <= rowHi;
  for (let i = 0; i < wr.boxes.length; i++) {
    const b = wr.boxes[i]!;
    if (!b.alive || (!jetRow && b.kind !== 'charger')) continue;
    const bb = world.boxBounds(b, this.timeSec, this.bb);
    if (jx1 <= bb.x0 || jx0 >= bb.x1 || jz1 <= bb.z0 || jz0 >= bb.z1) continue;
    // The box's height range [y0, top] has to overlap the jet's [jetBottom, jetTop]
    // (you can pass under or over floating boxes and droppers).
    if (bb.y1 <= jetBottom || bb.y0 >= jetTop) continue;

    if (this.hasShield || this.stepShieldUsed) {
      // Every box overlapped in the same step (even in another strip) is passed with the one shield.
      this.stepShieldUsed = true;
      this.hasShield = false;
      this.breakBox(b, bb, offsetX);
    } else {
      this.crash('box');
      return true;
    }
  }
}
return false;
```
:::

The walls and the ground are checked before any box, and they end the run whether you have a shield or not.

## Rendering

### A hand-written 3D projection

There is no WebGL and no 3D library. Each box is projected to the screen with a few lines of math and drawn as flat 2D polygons. The camera sits 3 m up and 7.5 m behind the jet, pulling back up to another 0.8 m at top speed, and it looks down at 9°. It follows the jet's sideways position with a 0.12 s lag and follows its altitude, so the jet stays low in the centre of the screen. The focal length is the smaller of the values for a 25° vertical and a 32° horizontal half-angle. On a narrow portrait phone the horizontal limit wins, so the whole track still fits on screen. Boost widens the view by up to 15%.

Boxes are sorted the way a painter would: far rows first, and within a row, boxes far from the camera's column before the near ones. For each box only the faces the camera can see are drawn: the top (when the camera is above it), the front, one side, and the underside of a floating box seen from below.

The projection and the fog lookup are both small pure functions:

::: details Show code · src/view/camera.ts
```ts
// src/view/camera.ts (excerpt, comments translated)
/** Fog step (0..steps-1): t = clamp((dz - near)/(far - near)), quantized. 0 = base colour, steps-1 = fog colour. */
export function fogStep(
  dz: number,
  fogNear: number = VIEW_CONFIG.fog.near,
  fogFar: number = VIEW_CONFIG.fog.far,
  steps: number = VIEW_CONFIG.fog.steps,
): number {
  const t = (dz - fogNear) / (fogFar - fogNear);
  if (!(t > 0)) return 0;
  if (t >= 1) return steps - 1;
  return Math.round(t * (steps - 1));
}

export class Camera {
  // ...
  /** World point -> screen (CSS px). Returns false when z' < near (out is left untouched). */
  project(x: number, y: number, z: number, out: ProjPoint): boolean {
    const dx = x - this.x;
    const dy = y - this.y;
    const dz = z - this.z;
    const zp = dz * this.cosP - dy * this.sinP;
    if (zp < this.near) return false;
    const yp = dy * this.cosP + dz * this.sinP;
    const k = this.f / zp;
    out.sx = this.cx + dx * k;
    out.sy = this.cy - yp * k;
    out.zp = zp;
    return true;
  }
}
```
:::

### Fog and colour

Fog starts 35 m from the camera and swallows everything by 110 m. Blending every face's colour toward the fog colour every frame would mean building colour strings in the game loop, so the blend is cut into 12 steps and each face type (top, front, side, underside) gets a table of 12 colour strings built in advance. Drawing a box picks a string from the table.

The light changes as you fly. Every 30 s of flight the sky, haze, ground, boxes and skyline move to the next of five colour sets: midday, late afternoon, sunset, dusk and dawn haze, then back to midday, a 150 s cycle. Each change blends over 3 s in 12 steps, and the tables for every step are built once when the game starts. Inside the frame the renderer only works out which step it is on.

### Sprites and pools

Glows are never drawn with `shadowBlur` during play. The ring glow is drawn once to offscreen canvases (blue and green, each at four sizes) and redrawn only when the pixel ratio changes. The exhaust gradients are also built once and reused. Particles for ring bursts, shield breaks and the crash come from a fixed pool of 160 that is reused, and boxes, rows, rings and events are pooled in the core, so the frame loop allocates close to nothing. The pixel ratio is capped at 2.

Reduced motion, taken from the system setting or the Options panel, removes the screen shake, the camera roll, the speed lines and the boost change in the field of view, and halves the particles and the flash.

## Audio

Every sound is synthesized with WebAudio. There are no audio files. The music is a tense loop at 146 BPM in A minor: short chord stabs, a bass playing an eighth-note ostinato, and light drums, in two 8-bar sections that alternate. It builds with distance. The bass, the kick and off-beat hi-hats play from the start, the snare on beats 2 and 4 joins at 300 m, and 16th-note hi-hats and a fast lead arpeggio join at 1000 m. A timer wakes up every 25 ms and books every step that falls within the next 0.1 s on the audio clock, so the beat stays even when frames drop. The music plays quietly on the title screen, fades out half a second after a crash, and starts again from the first bar on the next run.

The sound effects follow the same events as the visuals: a rising C-E-G arpeggio for a ring, a sweep for a shield, a crack when a shield breaks, a noise burst with a falling pitch for a crash, and a two-note fanfare for a new record. Boost starts with a heavy low thump and a rising noise sweep, and a quiet hiss plays while you hold it. A faint wind rises with speed. On phones that support vibration, a short buzz marks a ring (15 ms), a shield break (40 ms) and a crash. Browsers only allow audio after a user gesture, so the audio starts on your first tap or key press.

## Online leaderboard

Jet Rush uses the same online Top 10 as Stack Up and Bug Squash, and both maps share one board. There is no account. After a game over you can type a nickname and submit your score. Along with the score the game sends the distance flown, the rings passed and the flight time, and those are published with your entry. The nickname is shared with the other games on the site, so you only type it once. Nicknames may use letters, Hangul and numbers. Other players' names have a Report button, and **Options → Online scores (all games) → Delete mine** removes your scores from every game. If the server can't be reached, the game shows the scores saved on your device with the note `Offline: showing scores on this device`. The [Privacy Policy](/privacy-policy) lists exactly what is sent and stored.

The game also reports anonymous gameplay events to the site's cookie-free analytics, where every 1000 m flown in a run counts as a stage cleared. No nickname is included.

Your best score, best flight distance, local Top 10 and settings are kept in local storage. Every read and write is wrapped in `try/catch`, so the game still runs in a private window or with storage blocked. It just forgets your records.

## Tech stack and size

| Folder | What it does |
|---|---|
| `src/core` | World generation, flight, collisions, rings, shield, scoring. No DOM, canvas, audio or storage |
| `src/view` | Camera and projection, boxes, sky and skyline, rings, the jet, effects |
| `src/audio` | Music scheduler, wind, sound effects, audio settings |
| `src/input` | Steering, climb, dive and boost from keys, touch halves and on-screen buttons |
| `src/ui` | Screens, HUD, options, records, the leaderboard, the touch button editor |
| `src/shared` | The player profile and leaderboard code shared by every DevCol game |

It's written in TypeScript, built with Vite and tested with Vitest, with no game engine, no framework and no CDN. Everything ships in the build, including the Rajdhani font, and the production build is about 143 KB, checked against a 300 KB limit in CI. Like the other games it was developed spec-first with Claude Code: each change started as a numbered task spec, and the playtest notes on feel (the boost sound, the trails, the button layout on a phone) were written back into the spec as numbered fixes.

---

Jet Rush is part of [Arcade Web](/projects/arcade-web), together with [Stack Up](/projects/stack-up), [Bug Squash](/projects/bug-squash) and [Melon Merge](/projects/melon-merge). [Play it here](/arcade/jet-rush). The Rajdhani font is bundled under the SIL Open Font License.
