<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { data as blog } from './posts.data'

// Public summary from the DevCol analytics Worker (devcol-main/devcol-analytics).
// Aggregates only; the Worker already reports any count under 5 as "<5".
const ENDPOINT = 'https://a.devcol.net/public/summary'

type Count = number | '<5'
type Summary = {
  updated: string | null
  since: string | null
  pageviews_30d: Count
  visitors_30d: Count
  top_posts_30d: { path: string; title: string | null; views: Count }[]
  games: { game: string; plays_total: Count; best_score: number }[]
  top_sources_30d: { source: string; share: number }[]
}

const data = ref<Summary | null>(null)
const failed = ref(false)

onMounted(async () => {
  try {
    const res = await fetch(ENDPOINT)
    if (!res.ok) throw new Error(String(res.status))
    data.value = await res.json()
  } catch {
    failed.value = true
  }
})

const postTitle = new Map(blog.posts.map((p) => [p.link, p.title]))
const titleOf = (p: { path: string; title: string | null }) =>
  postTitle.get(p.path.replace(/\.html$/, '').replace(/\/$/, '')) ?? p.title?.replace(/ \| DevCol$/, '') ?? p.path
const gameName = (slug: string) => slug.split('-').map((w) => w[0].toUpperCase() + w.slice(1)).join(' ')
const fmtCount = (n: Count) => (typeof n === 'number' ? n.toLocaleString('en-US') : n)
const fmtMonth = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', year: 'numeric', timeZone: 'UTC' })
const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
const pct = (s: number) => `${Math.round(s * 100)}%`
const since = computed(() => (data.value?.since ? fmtMonth(data.value.since) : null))
</script>

<template>
  <div class="site-stats">
    <p v-if="failed" class="ss-note">Stats are not available right now. Try again later.</p>
    <p v-else-if="!data" class="ss-note">Loading…</p>
    <template v-else-if="!data.updated">
      <p class="ss-note">Counting started recently. The first numbers show up the day after the first visits.</p>
    </template>
    <template v-else>
      <div class="ss-tiles">
        <div class="ss-tile">
          <span class="ss-label mono">Page views · 30 days</span>
          <span class="ss-value">{{ fmtCount(data.pageviews_30d) }}</span>
        </div>
        <div class="ss-tile">
          <span class="ss-label mono">Visitors · 30 days</span>
          <span class="ss-value">{{ fmtCount(data.visitors_30d) }}</span>
        </div>
      </div>

      <h2 id="games">Games</h2>
      <p v-if="!data.games.length" class="ss-note">No plays recorded yet.</p>
      <table v-else>
        <thead><tr><th>Game</th><th class="num">Plays since {{ since }}</th><th class="num">Best score</th></tr></thead>
        <tbody>
          <tr v-for="g in data.games" :key="g.game">
            <td>{{ gameName(g.game) }}</td>
            <td class="num">{{ fmtCount(g.plays_total) }}</td>
            <td class="num">{{ g.best_score.toLocaleString('en-US') }}</td>
          </tr>
        </tbody>
      </table>

      <h2 id="popular-posts">Most read posts · 30 days</h2>
      <p v-if="!data.top_posts_30d.length" class="ss-note">No post views yet.</p>
      <ol v-else class="ss-list">
        <li v-for="p in data.top_posts_30d" :key="p.path">
          <a :href="p.path">{{ titleOf(p) }}</a>
          <span class="ss-count mono">{{ fmtCount(p.views) }}</span>
        </li>
      </ol>

      <h2 id="sources">Where visitors come from · 30 days</h2>
      <p v-if="!data.top_sources_30d.length" class="ss-note">Not enough visits yet.</p>
      <ul v-else class="ss-bars">
        <li v-for="s in data.top_sources_30d" :key="s.source">
          <span class="ss-src">{{ s.source }}</span>
          <span class="ss-bar" aria-hidden="true"><span :style="{ width: pct(s.share) }"></span></span>
          <span class="ss-count mono">{{ pct(s.share) }}</span>
        </li>
      </ul>

      <p class="ss-foot">
        Updated {{ fmtDay(data.updated) }} · counting since {{ since }} · numbers under 5 are shown as “&lt;5”.
      </p>
    </template>
  </div>
</template>

<style scoped>
.ss-tiles {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 12px;
  margin: 24px 0 8px;
}
.ss-tile {
  display: flex;
  flex-direction: column;
  gap: 6px;
  padding: 18px 20px;
  border: 1px solid var(--line-strong);
  border-radius: var(--radius-sm);
  background: var(--surface);
}
.ss-label {
  font-size: 12px;
  color: var(--vp-c-text-3);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}
.ss-value {
  font-family: var(--font-display);
  font-size: 34px;
  font-weight: 600;
  line-height: 1.1;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
}
.num {
  text-align: right;
  font-variant-numeric: tabular-nums;
}
.ss-list {
  list-style: none;
  padding: 0;
}
.ss-list li,
.ss-bars li {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.ss-list li a {
  flex: 1;
  min-width: 0;
}
.ss-count {
  font-size: 13px;
  color: var(--vp-c-text-2);
  font-variant-numeric: tabular-nums;
}
.ss-bars {
  list-style: none;
  padding: 0;
}
.ss-src {
  flex: 0 0 9em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ss-bar {
  flex: 1;
  height: 8px;
  border-radius: 4px;
  background: var(--surface-2);
  align-self: center;
  overflow: hidden;
}
.ss-bar span {
  display: block;
  height: 100%;
  border-radius: 4px;
  background: var(--accent);
}
.ss-note,
.ss-foot {
  color: var(--vp-c-text-2);
}
.ss-foot {
  margin-top: 32px;
  font-size: 13px;
}
</style>
