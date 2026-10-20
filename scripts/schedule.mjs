#!/usr/bin/env node
// Scheduled publishing. A page with `publishAt: YYYY-MM-DD` in its frontmatter stays hidden until
// that day (Asia/Seoul). CI runs this before `vitepress build` on a fresh checkout: it deletes the
// pages that aren't due yet and removes every link to them, so the build has no dead links.
//
//   node scripts/schedule.mjs          apply (CI only — it deletes files in the checkout)
//   node scripts/schedule.mjs --dry    list what is hidden and the upcoming queue, change nothing
//   node scripts/schedule.mjs --today 2026-10-25 --dry   pretend it's another day
import { readFileSync, writeFileSync, readdirSync, rmSync, statSync } from 'node:fs'
import { join, relative, dirname, resolve, posix } from 'node:path'

const DOCS = resolve(dirname(new URL(import.meta.url).pathname), '../docs')
const args = process.argv.slice(2)
const dry = args.includes('--dry')
const ti = args.indexOf('--today')
const today = ti >= 0 ? args[ti + 1]
  : new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul' }).format(new Date()) // YYYY-MM-DD

const walk = (d) => readdirSync(d).flatMap((f) => {
  if (f.startsWith('.') || f === 'public' || f === 'node_modules') return []
  const p = join(d, f)
  return statSync(p).isDirectory() ? walk(p) : f.endsWith('.md') ? [p] : []
})

const files = walk(DOCS)
const publishAt = (src) => src.match(/^---\r?\n[\s\S]*?^publishAt:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1]
const route = (f) => '/' + relative(DOCS, f).split('\\').join('/').replace(/\.md$/, '').replace(/(^|\/)index$/, '$1')

const queue = files.map((f) => ({ f, at: publishAt(readFileSync(f, 'utf-8')) })).filter((x) => x.at)
const hidden = queue.filter((x) => x.at > today)
const hiddenRoutes = new Set(hidden.map((x) => route(x.f).replace(/\/$/, '')))

console.log(`[schedule] today ${today} (KST): ${queue.length - hidden.length} due, ${hidden.length} hidden`)
for (const x of hidden.sort((a, b) => a.at.localeCompare(b.at))) console.log(`  ${x.at}  ${route(x.f)}`)
if (dry || !hidden.length) process.exit(0)

// Resolve a markdown link target to a site route, or null if it isn't an internal page link.
function target(fromFile, href) {
  if (/^[a-z]+:|^#|^\/\//i.test(href)) return null
  const path = href.split('#')[0].split('?')[0].replace(/\.(md|html)$/, '').replace(/\/$/, '')
  if (!path) return null
  const abs = path.startsWith('/') ? path : posix.join(posix.dirname(route(fromFile).replace(/\/$/, '/x')), path)
  return posix.normalize(abs).replace(/\/index$/, '')
}

const LINK = /\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
const LIST = /^\s*(?:[-*+]|\d+\.)\s|^\s*\|/ // list item or table row

for (const x of hidden) rmSync(x.f)
for (const f of files.filter((f) => !hidden.some((x) => x.f === f))) {
  const src = readFileSync(f, 'utf-8')
  let changed = false
  const out = []
  for (const line of src.split('\n')) {
    const hits = [...line.matchAll(LINK)].filter((m) => hiddenRoutes.has(target(f, m[2])))
    if (!hits.length) { out.push(line); continue }
    changed = true
    if (LIST.test(line)) continue // drop the whole entry
    out.push(line.replace(LINK, (m, text, href) => (hiddenRoutes.has(target(f, href)) ? text : m)))
  }
  if (changed) { writeFileSync(f, out.join('\n')); console.log(`  unlinked in ${route(f)}`) }
}
