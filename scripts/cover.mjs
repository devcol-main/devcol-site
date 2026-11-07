#!/usr/bin/env node
// Cover image for a DevLog post, in the style of the existing *-c.jpg covers.
// Writes docs/public/blog/<name>.jpg and <name>-dark.jpg (1600x1000). posts.data.ts picks up the
// -dark file on its own, so the post only needs `image: /blog/<name>.jpg`.
//
//   node scripts/cover.mjs <name> --label "PSEUDO · DEBUGGING" --title "Tick|= false" --caption "One sentence."
//
// --title: 1-3 short lines separated by "|"; the last line is drawn in the accent color.
// Needs Playwright with Chromium (preinstalled in the cloud task). Exits non-zero if it can't render.
import { createRequire } from 'node:module'
import { existsSync, mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = fileURLToPath(new URL('..', import.meta.url))
const args = process.argv.slice(2)
const name = args[0]
const opt = (k) => { const i = args.indexOf(`--${k}`); return i > 0 ? args[i + 1] ?? '' : '' }
const label = opt('label'), title = opt('title'), caption = opt('caption')
if (!name || name.startsWith('--') || !/^[a-z0-9-]+$/.test(name) || !label || !title || !caption) {
  console.error('usage: node scripts/cover.mjs <name: a-z0-9-> --label "..." --title "line|accent line" --caption "..."')
  process.exit(2)
}
const lines = title.split('|').map((s) => s.trim()).filter(Boolean)
if (lines.length > 3) { console.error('--title: at most 3 lines'); process.exit(2) }

let chromium
try {
  const req = createRequire(`${root}/`)
  try { ({ chromium } = req('playwright')) } catch { ({ chromium } = createRequire('/')('playwright')) }
} catch {
  console.error('playwright not found; no cover written'); process.exit(1)
}

const font = (p) => pathToFileURL(`${root}/node_modules/${p}`).href
const archivo = font('@fontsource-variable/archivo/files/archivo-latin-wght-normal.woff2')
const plex = font('@fontsource/ibm-plex-mono/files/ibm-plex-mono-latin-400-normal.woff2')
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c])

// Small per-post variation in the decoration, stable for a given name.
let h = 0
for (const c of name) h = (h * 31 + c.charCodeAt(0)) >>> 0
const tilt = [-14, -9, 8, 12, 16][h % 5]
const shape = ['circle', 'bar', 'slit'][(h >> 3) % 3]

const themes = {
  light: { bg1: '#f7f8fc', bg2: '#eef0f7', glow: 'rgba(120,130,220,.14)', text: '#0d1120', accent: '#2b3fdb', label: '#2b3fdb', dot: '#e0a020', cap: '#3b4357', foot: '#6b7280', frame: 'rgba(13,17,32,.22)', mark: 'rgba(43,63,219,.45)' },
  dark: { bg1: '#1e2442', bg2: '#171b33', glow: 'rgba(120,130,230,.16)', text: '#eef0f8', accent: '#8f9cff', label: '#a9b3ff', dot: '#f2b84a', cap: '#c9cee0', foot: '#9aa1b8', frame: 'rgba(170,180,230,.4)', mark: 'rgba(222,110,110,.8)' },
}

const html = (t) => `<!doctype html><html><head><meta charset="utf-8"><style>
@font-face { font-family: Archivo; src: url(${archivo}) format('woff2'); font-weight: 100 900; }
@font-face { font-family: Plex; src: url(${plex}) format('woff2'); }
* { margin: 0; box-sizing: border-box; }
body { width: 1600px; height: 1000px; overflow: hidden; position: relative; font-family: Archivo, sans-serif;
  background: radial-gradient(520px circle at 82% 18%, ${t.glow}, transparent 70%), linear-gradient(160deg, ${t.bg1}, ${t.bg2}); }
.label { position: absolute; left: 78px; top: 64px; font: 500 22px Plex, monospace; letter-spacing: .28em; color: ${t.label}; }
.label::before { content: ''; display: inline-block; width: 9px; height: 9px; border-radius: 50%; background: ${t.dot}; margin-right: 16px; vertical-align: 4px; }
.title { position: absolute; left: 74px; top: 200px; width: 940px; font-weight: 780; letter-spacing: -.035em; line-height: .98; color: ${t.text}; }
.title div { white-space: nowrap; }
.title div:last-child { color: ${t.accent}; }
.cap { position: absolute; left: 78px; bottom: 70px; width: 860px; font-size: 32px; line-height: 1.45; color: ${t.cap}; }
.foot { position: absolute; right: 74px; bottom: 60px; font: 20px Plex, monospace; letter-spacing: .12em; color: ${t.foot}; }
.deco { position: absolute; left: 1080px; top: 230px; width: 380px; height: 380px; border: 2px solid ${t.frame}; border-radius: 28px; transform: rotate(${tilt}deg); display: grid; place-items: center; }
.deco i { display: block; border: 2px solid ${t.mark}; }
.deco .circle { width: 200px; height: 200px; border-radius: 50%; }
.deco .bar { width: 220px; height: 64px; border-radius: 12px; }
.deco .slit { width: 2px; height: 220px; border-width: 0 0 0 2px; }
</style></head><body>
<div class="label">${esc(label)}</div>
<div class="title" id="t">${lines.map((l) => `<div>${esc(l)}</div>`).join('')}</div>
<div class="deco"><i class="${shape}"></i></div>
<div class="cap">${esc(caption)}</div>
<div class="foot">devcol.net</div>
</body></html>`

const out = `${root}/docs/public/blog`
if (!existsSync(out)) mkdirSync(out, { recursive: true })
// file:// page so the local font files load (setContent pages can't read them).
const tmp = mkdtempSync(`${tmpdir()}/devcol-cover-`)
const browser = await chromium.launch()
try {
  const page = await browser.newPage({ viewport: { width: 1600, height: 1000 } })
  for (const [mode, t] of Object.entries(themes)) {
    writeFileSync(`${tmp}/c.html`, html(t))
    await page.goto(pathToFileURL(`${tmp}/c.html`).href)
    await page.evaluate(() => document.fonts.ready)
    if (!(await page.evaluate(() => document.fonts.check('780 100px Archivo')))) throw new Error('Archivo font did not load')
    // Largest size (max 190px) at which every line fits the 940px column and the block clears the caption.
    await page.evaluate((n) => {
      const el = document.getElementById('t')
      let size = n === 1 ? 190 : n === 2 ? 170 : 128
      el.style.fontSize = `${size}px`
      while (size > 56 && (el.scrollWidth > 940 || [...el.children].some((d) => d.scrollWidth > 940) || el.offsetHeight > 560)) {
        size -= 4; el.style.fontSize = `${size}px`
      }
    }, lines.length)
    const file = `${out}/${name}${mode === 'dark' ? '-dark' : ''}.jpg`
    await page.screenshot({ path: file, type: 'jpeg', quality: 88 })
    console.log(`wrote ${file.replace(`${root}/`, '')}`)
  }
} finally {
  await browser.close()
  rmSync(tmp, { recursive: true, force: true })
}
