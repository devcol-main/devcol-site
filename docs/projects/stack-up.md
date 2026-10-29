---
title: Stack Up
description: "A one-button neon tower stacking game you can play in the browser. Rules, scoring, tips, the code behind the game loop and rules, and questions worth thinking through. Built with TypeScript, Canvas 2D, and WebAudio."
outline: deep
---

# Stack Up

*Arcade Web · TypeScript, Canvas 2D, WebAudio* · [GitHub: Stack-Up](https://github.com/devcol-main/Stack-Up)

Stack Up is a one-button tower stacking game. A block slides back and forth across the screen, and you tap to drop it onto the tower. Only the part that overlaps the block below stays. Whatever hangs over the edge is cut off, so the tower gets narrower as you climb while the blocks keep getting faster. Line a block up almost exactly and it counts as a Perfect, which scores more and, if you keep a streak going, slowly gives back the width you lost. If a block misses the tower completely, the run is over.

<GameFrame slug="stack-up" title="Stack Up, a one-button tower stacking game" hint="Click the game once, then Space works too." />

## How to play

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-screens.jpg" alt="Stack Up title screen and game over screen with the Top 10" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-screens-dark.jpg" alt="Stack Up title screen and game over screen with the Top 10" loading="lazy">
  <figcaption>The title screen and the game over screen with the nickname box and the Top 10.</figcaption>
</figure>

- Tap, click, or press Space to start and to drop a block. The keyboard only works after the game has focus, so click it once first.
- Press M or use the Sound button to mute. The Options panel has separate BGM and SFX switches with volume sliders, a Reduced motion setting, and a button that clears your best score and Top 10.
- After a game over you can type a nickname and press Submit to put your score on the Top 10. Tap again to start a new run.

Scores are stored in your browser only. Nothing is sent to a server, so the Top 10 you see is the one on this device.

## Scoring

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-drop.jpg" alt="A drop keeps the overlap with the block below and cuts off the overhang; a Perfect window snaps the block into place" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-drop-dark.jpg" alt="A drop keeps the overlap with the block below and cuts off the overhang; a Perfect window snaps the block into place" loading="lazy">
  <figcaption>Every drop keeps only the overlap. Inside the Perfect window, the block snaps onto the one below instead.</figcaption>
</figure>

- Every block you stack is worth 1 point.
- A drop counts as Perfect when it lands within 4.5% of the block's own width from the block below (with a small minimum, so very thin blocks still have some room). A Perfect block snaps exactly onto the tower and keeps its full width.
- If there is no overlap at all, the block falls and the run ends.
- Milestones play at 5 floors, at 10, and then every 10 floors after that.

### Perfect streaks

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-streak.jpg" alt="Five Perfects in a row score +2 to +6 and give back 8% of the starting width; a cut scores +1 and resets the streak" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-streak-dark.jpg" alt="Five Perfects in a row score +2 to +6 and give back 8% of the starting width; a cut scores +1 and resets the streak" loading="lazy">
  <figcaption>A streak pays in points and, every fifth Perfect, in width.</figcaption>
</figure>

- A Perfect is worth 1 point plus a combo bonus equal to your current Perfect streak, capped at +5. The first Perfect in a row gives 2 points, and the fifth or later gives 6.
- Every 5 Perfects in a row, the block gets back 8% of its starting width. It never grows past the starting width, which is 55% of the play area.
- Any cut resets the streak to 0.

### Speed and difficulty

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-speed.jpg" alt="Block speed starts at 0.4 screen widths per second, rises 0.025 per floor, and stays at 1.2 from floor 33" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-speed-dark.jpg" alt="Block speed starts at 0.4 screen widths per second, rises 0.025 per floor, and stays at 1.2 from floor 33" loading="lazy">
  <figcaption>Speed in screen widths per second, by floor.</figcaption>
</figure>

Blocks start at 0.4 play-area widths per second and get 0.025 faster each floor, up to 1.2. That cap arrives at about floor 33. The first block comes from a random side, and after that the side alternates every floor. The speed stays the same for the whole floor, so the only thing that changes between passes is where you are in the rhythm.

## Tips

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-run.jpg" alt="A run at floor 10 with a seven-Perfect streak, the 10 FLOORS milestone, and the next block sliding in" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-run-dark.jpg" alt="A run at floor 10 with a seven-Perfect streak, the 10 FLOORS milestone, and the next block sliding in" loading="lazy">
  <figcaption>Floor 10 with a seven-Perfect streak. The early cuts are still visible at the bottom of the tower.</figcaption>
</figure>

1. Go for Perfects while the blocks are still slow. Each run of 5 restores width, so an early streak decides how much room you have later.
2. The speed stays the same within a floor and the side alternates. Watch a pass or two to get the rhythm before you tap.
3. When the tower is thin, aim to overlap, not to be perfect. A big cut makes every block after it smaller too, so avoiding one large mistake matters more than one extra Perfect.
4. After about floor 33 the speed stops rising. From there it's about staying focused.
5. Each Perfect plays a note from a major pentatonic scale, one step higher for every Perfect in the streak, up to the tenth note. With sound on you can tell a streak is still alive without looking at the score.

## How it was made

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-architecture.jpg" alt="Input calls drop on the core logic; the core emits events that the view, audio and UI modules consume; main.ts runs the frame loop" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-architecture-dark.jpg" alt="Input calls drop on the core logic; the core emits events that the view, audio and UI modules consume; main.ts runs the frame loop" loading="lazy">
  <figcaption>The rules live in one plain TypeScript class. Rendering, sound and screens only react to its events.</figcaption>
</figure>

Stack Up uses no game engine and no framework. It is about 3,000 lines of TypeScript split into four folders, built with Vite and tested with Vitest:

| Folder | What it does | Allowed to touch |
|---|---|---|
| `src/core` | The rules: blocks, overlap, scoring, speed, events | Nothing outside itself |
| `src/view` | Canvas rendering, glow sprites, particles, camera | The canvas |
| `src/audio` | Synthesized sound effects and the background music | WebAudio |
| `src/ui` | Screens, HUD, options, best score, Top 10 | The DOM and `localStorage` |

`src/main.ts` wires them together: it turns input into `logic.drop()`, runs the frame loop, and hands every event from the core to the view, the audio and the UI.

### The game loop

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-frame.jpg" alt="Each frame: requestAnimationFrame, clock tick, logic update, consume events, flow and HUD, renderer; input calls drop between frames" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-frame-dark.jpg" alt="Each frame: requestAnimationFrame, clock tick, logic update, consume events, flow and HUD, renderer; input calls drop between frames" loading="lazy">
  <figcaption>Every frame runs the same six steps in the same order.</figcaption>
</figure>

The whole game runs inside one `requestAnimationFrame` callback. The order matters: the rules move first, then their events are handled, then the screen is drawn, so the picture always shows the state the rules just produced.

```ts
// src/main.ts (abridged)
const clock = new FrameClock(UI_CONFIG.maxFrameDt); // maxFrameDt = 0.05 s

const frame = (now: number): void => {
  const dt = clock.tick(now);         // seconds since the last frame, 0 while paused
  if (resizeDirty) {
    resizeDirty = false;
    renderer.resize();
  }
  logic.update(dt);                   // slide the moving block
  logic.consumeEvents(onEvent);       // land, cut, perfect, regrow, milestone, gameOver
  flow.update(dt);
  ui.setScore(logic.score);
  renderer.update(dt);
  renderer.render();
  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);
```

The clock is a tiny class with no DOM in it, so it is tested on its own. It turns timestamps into a time step, returns 0 while the tab is hidden, starts fresh after the tab comes back so the block does not jump, and caps a single step at 0.05 seconds:

```ts
// src/ui/frameClock.ts
tick(nowMs: number): number {
  if (this.paused || !Number.isFinite(nowMs)) return 0;
  const prev = this.last;
  this.last = nowMs;
  if (prev === null) return 0;        // first frame after start or resume
  const dt = (nowMs - prev) / 1000;
  if (!(dt > 0)) return 0;            // NaN, 0 or negative
  return dt > this.maxDt ? this.maxDt : dt;
}
```

### The rules in code

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-events.jpg" alt="One drop emits up to five events in a fixed order: cut, land, perfect, regrow, milestone, each with a view and an audio reaction" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-events-dark.jpg" alt="One drop emits up to five events in a fixed order: cut, land, perfect, regrow, milestone, each with a view and an audio reaction" loading="lazy">
  <figcaption>The core never draws or plays anything. It pushes events, and the other modules decide what each one looks and sounds like.</figcaption>
</figure>

Everything in the Scoring section comes from one method, `StackUpLogic.drop()`. Positions are in screen widths (the play area is 1.0 wide), so the rules do not care about pixels or devices:

```ts
// src/core/StackUpLogic.ts (abridged)
drop(): void {
  if (this.isGameOver) return;
  const cfg = this.config, cur = this.current, top = this.top;

  const ovL = Math.max(cur.x, top.x);
  const ovR = Math.min(cur.x + cur.w, top.x + top.w);
  const overlap = ovR - ovL;
  if (overlap <= 0) {                       // missed the tower completely
    this.isGameOver = true;
    this.events.push({ type: 'gameOver', score: this.score, /* … */ });
    return;
  }

  const tolerance = Math.max(cur.w * cfg.perfectToleranceRatio, cfg.perfectToleranceMin);
  let x: number, w: number, perfect = false;

  if (Math.abs(cur.x - top.x) <= tolerance) {   // Perfect: snap, keep the width
    perfect = true;
    this.combo++;
    x = top.x;
    w = cur.w;
    this.score += cfg.pointsPerLevel + Math.min(this.combo, cfg.comboBonusCap);
  } else {                                       // cut: keep only the overlap
    this.combo = 0;
    x = ovL;
    w = overlap;
    this.events.push({ type: 'cut', /* the piece that falls off */ });
    this.score += cfg.pointsPerLevel;
  }

  if (perfect && this.combo % cfg.regrowEveryCombo === 0) {
    const newW = Math.min(cfg.baseWidth, w + cfg.baseWidth * cfg.regrowRatio);
    x -= (newW - w) / 2;                         // grow around the center
    w = newW;
  }

  this.blocks.push({ x, w, level: cur.level, colorIndex: cur.colorIndex });
  this.events.push({ type: 'land', /* … */ perfect, combo: this.combo });
  // … perfect, regrow and milestone events, then the next moving block
}
```

Every number in that method is a named value in one config object, which is where balancing happens:

```ts
// src/core/config.ts
export const DEFAULT_CONFIG: StackUpConfig = {
  baseWidth: 0.55,               // starting width, 55% of the screen
  perfectToleranceRatio: 0.045,  // Perfect window = 4.5% of the block width…
  perfectToleranceMin: 0.006,    // …but never smaller than this
  regrowEveryCombo: 5,
  regrowRatio: 0.08,             // +8% of the starting width
  speedStart: 0.4,               // screen widths per second
  speedPerLevel: 0.025,
  speedMax: 1.2,
  pointsPerLevel: 1,
  comboBonusCap: 5,
  // …
};
```

Events go into a queue and are handed out in one call per frame. That keeps the order fixed (a cut always comes before its landing, a milestone always last), and it means the core never calls into rendering or audio code it should not know about.

### Glow without `shadowBlur`

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-glow.jpg" alt="Each block color is drawn once to an offscreen canvas with shadowBlur, then every frame each block is drawn with three drawImage calls that stretch the middle" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-glow-dark.jpg" alt="Each block color is drawn once to an offscreen canvas with shadowBlur, then every frame each block is drawn with three drawImage calls that stretch the middle" loading="lazy">
  <figcaption>The expensive blur happens once per color. Every frame after that is plain image copies.</figcaption>
</figure>

The neon look is a starfield and gradient background with glowing blocks. `shadowBlur` on a canvas is a real blur, and doing it for every block on every frame is one of the easiest ways to drop frames on a phone. So each block color is drawn once to an offscreen canvas, glow included, and only rebuilt when the size or the pixel ratio changes:

```ts
// src/view/glowSprites.ts (abridged): runs on resize, not per frame
this.sheets = BLOCK_STYLES.map((st) => {
  const surface = this.createSurface(this.spriteW, spriteH);
  const g = surface.getContext('2d')!;
  g.fillStyle = st.fill;
  g.fillRect(x, y, w, h);
  g.shadowColor = st.glow;
  g.shadowBlur = blockH * VIEW_CONFIG.glowBlur * dpr;  // device pixels
  g.strokeStyle = st.stroke;
  g.strokeRect(x + lw / 2, y + lw / 2, w - lw, h - lw);
  return surface;
});
```

Blocks change width all the time, so the sprite is drawn in three slices, like a nine-slice image cut only horizontally: the two glowing ends are copied as they are and the middle is stretched. Edges are rounded to whole device pixels so no seam shows between slices. Particles for cuts and Perfects come from a fixed pool that is reused instead of being created and thrown away.

### Sound without audio files

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-audio.jpg" alt="A setInterval timer every 80 ms schedules notes up to 0.3 seconds ahead of the audio context clock" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-audio-dark.jpg" alt="A setInterval timer every 80 ms schedules notes up to 0.3 seconds ahead of the audio context clock" loading="lazy">
  <figcaption>The timer only wakes up the scheduler. The notes themselves are timed by the audio clock.</figcaption>
</figure>

Every sound is synthesized with WebAudio oscillators and noise, including the background music, which is a step sequencer in A minor pentatonic at 108 BPM. That's a big part of why the whole build is 124 KB.

Music cannot be driven from `requestAnimationFrame`: frames stop when the tab is hidden and stutter when the page is busy. Instead a timer wakes up every 80 ms and books every note that falls within the next 0.3 seconds on the audio clock, which keeps perfect time even if the timer itself is late:

```ts
// src/audio/AudioManager.ts (abridged)
private scheduleBgm(): void {
  const ctx = this.ctx;
  if (!ctx || ctx.state !== 'running') return;
  const now = ctx.currentTime;
  let next = nextBgmTime(this.bgmNextTime, now, 0);   // re-anchor only if we fell behind
  while (next < now + C.bgm.lookahead) {              // lookahead = 0.3 s
    const st = bgmStep(this.bgmStepIndex);
    if (st.arp !== null) this.bgmTone(C.bgm.arp, st.arp, next);   // osc.start(next)
    if (st.bass !== null) this.bgmTone(C.bgm.bass, st.bass, next);
    if (st.hat) this.bgmHat(next);
    this.bgmStepIndex++;
    next += this.bgmStepDur;                           // one 8th note
  }
  this.bgmNextTime = next;
}
```

The sound effects follow the same event stream as the visuals. A pure function maps each event to a sound, and Perfect notes climb a major pentatonic scale with the streak:

```ts
// src/audio/audioLogic.ts
export function comboToStep(combo: number, maxStep = AUDIO_CONFIG.perfectMaxStep): number {
  if (!Number.isFinite(combo)) return 0;
  return Math.max(0, Math.min(maxStep, Math.floor(combo) - 1));
}

export function stepToFreq(step: number, base = 523.25 /* C5 */, scale = [0, 2, 4, 7, 9]): number {
  const s = Math.max(0, Math.floor(step));
  const octave = Math.floor(s / scale.length);
  return base * Math.pow(2, (scale[s % scale.length]! + 12 * octave) / 12);
}
```

Browsers only allow audio after a user gesture, so the audio context is created and resumed on the first tap or key press, and the game stays silent until then.

### A core that can be tested

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-tests.jpg" alt="A seed feeds a random generator into the core logic, which is driven by scripted inputs in Vitest and by a bot in headless Chrome to record the README GIF" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-tests-dark.jpg" alt="A seed feeds a random generator into the core logic, which is driven by scripted inputs in Vitest and by a bot in headless Chrome to record the README GIF" loading="lazy">
  <figcaption>The same seed and the same inputs always produce the same run, in tests and in the recorded GIF.</figcaption>
</figure>

The rules live in plain TypeScript that knows nothing about the page, the canvas, or audio. Randomness comes from a seeded generator that is passed in, and time comes in as a delta, so the same seed and the same inputs always give the same run:

```ts
// src/core/rng.ts — mulberry32, returns a number in [0, 1)
export function createRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
```

That is what lets the rules be covered by unit tests (215 of them, across rules, scoring, regrow, milestones, audio mapping, layout and storage). A test can play a whole game in a few lines:

```ts
// tests/StackUpLogic.test.ts
it('same seed and inputs produce the same event sequence including milestones', () => {
  const run = (seed: number): string => {
    const g = new StackUpLogic(createRng(seed));
    const log: StackUpEvent[] = [];
    for (let i = 0; i < 45 && !g.isGameOver; i++) {
      for (let k = 0; k < 5 + (i % 4); k++) g.update(1 / 60);
      g.current.x = g.top.x + (i % 3 === 0 ? 0.1 : 0);   // every third drop is off by 0.1
      g.drop();
      g.consumeEvents((e) => log.push(e));
    }
    return JSON.stringify(log);
  };
  expect(run(7)).toBe(run(7));
  expect(run(7)).toContain('milestone');
});
```

It's also how the GIF in the README is made: a small bot plays a seeded run in headless Chrome, pressing Space when the moving block lines up, and the frames are captured and encoded with ffmpeg.

### Built for the page it lives on

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-page.jpg" alt="Pausing on hidden tabs, a clean first frame after returning, a pixel ratio capped at 2, touch-action none, guarded localStorage and no CDN" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-page-dark.jpg" alt="Pausing on hidden tabs, a clean first frame after returning, a pixel ratio capped at 2, touch-action none, guarded localStorage and no CDN" loading="lazy">
  <figcaption>The details that make a canvas game behave inside a normal web page.</figcaption>
</figure>

The game pauses when you switch tabs, redraws when the frame is resized, caps the pixel ratio at 2, and keeps touch drags from scrolling the page while you play. Every `localStorage` read and write is wrapped in `try/catch`, so the game still runs in a private window or with storage blocked; it just forgets your best score. It uses no game engine, no framework, and no CDN, so everything it needs ships in the build, including the Geist font.

## Questions to think about

<figure class="theme-img">
  <img class="img-light" src="/projects/stack-up/stack-up-questions.jpg" alt="Six topics: game loop and time, deterministic logic, canvas performance, Web Audio timing, input and mobile, robustness" loading="lazy">
  <img class="img-dark" src="/projects/stack-up/stack-up-questions-dark.jpg" alt="Six topics: game loop and time, deterministic logic, canvas performance, Web Audio timing, input and mobile, robustness" loading="lazy">
  <figcaption>Six areas where a small browser game runs into real engineering questions.</figcaption>
</figure>

Building even a one-button game raises questions that go well beyond the game itself. Try answering each one yourself first, then open the notes to compare with what Stack Up does.

### Game loop and time

**Why use `requestAnimationFrame` instead of `setInterval` for the game loop?**

::: details Notes from Stack Up
`requestAnimationFrame` runs right before the browser paints, at the display's refresh rate, and stops when the tab is hidden. A `setInterval` loop drifts against the display, can run twice between paints or not at all, and keeps burning battery in background tabs.
:::

**Fixed or variable time step? What does this game use?**

::: details Notes from Stack Up
A variable step: each frame moves the block by `speed × dt`. That is simple and fine here because the only continuous motion is one block moving at constant speed, and the important decision (the drop) is an instant event, not something that depends on integration accuracy. Physics-heavy games usually prefer a fixed step with an accumulator so results don't depend on frame rate.
:::

**Why clamp `dt`, and why return 0 on the first frame after resuming?**

::: details Notes from Stack Up
After a long frame (a GC pause, a slow device) an unclamped `dt` would teleport the block across the screen. Capping it at 0.05 s means the game slows down for a moment instead of skipping. After a hidden tab comes back, the gap since the last frame could be minutes; resetting the reference timestamp makes that first frame a zero step instead.
:::

### Deterministic logic and testing

**How do you make game logic unit-testable?**

::: details Notes from Stack Up
Keep the rules free of side effects. The core has no DOM, canvas, audio or storage. It takes inputs (`update(dt)`, `drop()`), owns its state, and reports what happened as events. Randomness and time are injected. Tests can then drive a whole game with a loop and assert on the score, the blocks and the event log.
:::

**What does a seeded random number generator give you?**

::: details Notes from Stack Up
Reproducibility. With `Math.random()` a bug that depends on the starting side or colors can't be replayed. With a seeded generator (mulberry32 here, a few lines and fast), the same seed and inputs always produce the same run, which makes bugs reproducible, tests stable, and media captures repeatable. It is also the base for a daily challenge where everyone plays the same sequence.
:::

**Why do positions use normalized units instead of pixels?**

::: details Notes from Stack Up
The rules say "the block is 0.55 of the play area wide", not "300 px". That keeps the logic independent of screen size and pixel ratio, so a phone and a 4K monitor play the same game, and only the view converts to pixels.
:::

### Canvas performance

**Why avoid `shadowBlur` every frame, and what is the alternative?**

::: details Notes from Stack Up
A canvas shadow is a Gaussian blur computed on every draw call, and its cost grows with the blur radius and the area. Drawn for every block every frame, it is a common cause of dropped frames on mobile. The alternative is to pre-render the glowing shape once to an offscreen canvas and copy it with `drawImage`, which is cheap and GPU-friendly.
:::

**How do you draw a pre-rendered sprite at many different widths?**

::: details Notes from Stack Up
Slice it. The ends of the block (with their rounded glow) are copied at their natural size, and only the flat middle section is stretched. Rounding slice edges to whole device pixels avoids visible seams.
:::

**What is object pooling and why use it in JavaScript?**

::: details Notes from Stack Up
Particles are created and destroyed constantly. Allocating a new object for each one creates garbage, and garbage collection pauses show up as stutter. A pool allocates a fixed number of particle objects up front and reuses them, so the frame loop allocates almost nothing.
:::

**How do you handle high-DPI screens?**

::: details Notes from Stack Up
Size the canvas backing store to CSS size × `devicePixelRatio` and scale the context, so lines stay sharp. Stack Up caps the ratio at 2: a 3x phone would otherwise render 2.25 times as many pixels as at 2x for a difference that is hard to see.
:::

### Web Audio timing

**Why not play music notes from the frame loop?**

::: details Notes from Stack Up
Frame timing jitters by several milliseconds and stops in background tabs, and the ear notices rhythm errors quickly. Web Audio has its own high-precision clock (`AudioContext.currentTime`). The usual pattern, used here, is a lookahead scheduler: a coarse timer wakes up often and schedules every note due in the next fraction of a second at an exact audio-clock time.
:::

**Why does audio only start after the first tap?**

::: details Notes from Stack Up
Browsers block audible playback until the user interacts with the page. The audio context is created or resumed inside the first pointer or key handler; before that, the game is silent but fully playable.
:::

**How do you make sound without audio files?**

::: details Notes from Stack Up
Oscillators (square, sawtooth, triangle, sine) shaped with gain envelopes and filters, plus a short noise buffer for hi-hats and impacts. For a small arcade game that is enough for a full soundtrack, keeps the download tiny, and allows effects like a pitch that rises with the combo.
:::

### Input and mobile

**How do you handle mouse, touch and pen with one code path?**

::: details Notes from Stack Up
Pointer Events. `pointerdown` covers all three. Combined with `touch-action: none` on the canvas, the browser won't treat a tap as a scroll or a double-tap zoom, so input feels immediate.
:::

### Robustness

**What can go wrong with `localStorage`?**

::: details Notes from Stack Up
It can throw: in some private modes, when storage is full, when cookies are blocked, or inside sandboxed iframes. It also holds whatever an older version wrote. Every access here is wrapped in `try/catch`, stored values are validated when read, and the game falls back to defaults instead of crashing.
:::

**How would you add an online leaderboard to this?**

::: details Notes from Stack Up
The game already talks to a `LeaderboardService` interface, not to `localStorage` directly. A server implementation would replace the local one without touching the game. The hard part is trust: scores come from the client, so a real leaderboard needs server-side checks such as plausibility limits or replay validation using the seeded, deterministic core.
:::

---

Stack Up is part of [Arcade Web](/projects/arcade-web), together with [Bug Squash](/projects/bug-squash). The code is under the Apache 2.0 license, and the Geist font is bundled under the SIL Open Font License.
