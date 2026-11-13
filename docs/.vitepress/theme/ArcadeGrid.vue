<script setup lang="ts">
import { computed, ref } from 'vue'
import ProjectCard from './ProjectCard.vue'
import { games } from './arcade'

// Same public summary the /stats page reads (devcol-main/devcol-analytics). Counts under 5 come back as "<5".
const ENDPOINT = 'https://a.devcol.net/public/summary'

type Sort = 'newest' | 'popular'
const sort = ref<Sort>('newest')
const plays = ref<Map<string, number> | null>(null)
const failed = ref(false)
let loading: Promise<void> | null = null

const slugOf = (href: string) => href.split('/').filter(Boolean).pop()!

function loadPlays() {
  loading ??= fetch(ENDPOINT)
    .then((res) => {
      if (!res.ok) throw new Error(String(res.status))
      return res.json()
    })
    .then((d: { games?: { game: string; plays_total: number | '<5' }[] }) => {
      // "<5" ranks above 0 plays but below any real count.
      plays.value = new Map((d.games ?? []).map((g) => [g.game, typeof g.plays_total === 'number' ? g.plays_total : 1]))
    })
    .catch(() => {
      failed.value = true
    })
  return loading
}

function pick(s: Sort) {
  sort.value = s
  if (s === 'popular') loadPlays()
}

// Newest: by `date`, ties keep the order in arcade.ts. Popular: by plays, ties fall back to newest.
const newest = computed(() => [...games].sort((a, b) => (b.date ?? '').localeCompare(a.date ?? '')))
const shown = computed(() => {
  if (sort.value === 'newest' || !plays.value) return newest.value
  const n = (href: string) => plays.value!.get(slugOf(href)) ?? 0
  return [...newest.value].sort((a, b) => n(b.href) - n(a.href))
})
</script>

<template>
  <div class="projects-page arcade-page">
    <header class="projects-hero">
      <p class="eyebrow">Arcade</p>
      <h1>Short games you can play right here.</h1>
      <p class="lede">
        No install, no account. Each game runs in the browser and takes a minute or two a run. The TypeScript games work on a phone or a desktop; the Unity ones play best on a desktop. Pick one and play.
      </p>
    </header>

    <section class="pg-group">
      <div class="arcade-sort" role="group" aria-label="Sort games">
        <button type="button" class="tab" :aria-pressed="sort === 'newest'" @click="pick('newest')">Newest</button>
        <button type="button" class="tab" :aria-pressed="sort === 'popular'" @click="pick('popular')">Popular</button>
        <span v-if="sort === 'popular' && failed" class="arcade-sort-note">Play counts aren't available right now, so this is newest first.</span>
        <span v-else-if="sort === 'popular' && !plays" class="arcade-sort-note">Loading play counts…</span>
        <span v-else-if="sort === 'popular'" class="arcade-sort-note">By total plays, from the <a href="/stats">site stats</a>.</span>
      </div>
      <div class="pg-cards">
        <ProjectCard v-for="g in shown" :key="g.href" :item="g" />
      </div>
    </section>

    <p class="pg-contact">
      Found a bug or have an idea for the next game? Tell me on the <a href="/contact">Contact</a> page.
      How these games are built is on the <a href="/projects/arcade-web">Arcade Web</a> project page.
    </p>
  </div>
</template>

<style scoped>
.arcade-sort {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px 8px;
  margin-bottom: 20px;
}
.arcade-sort-note {
  margin-left: 6px;
  color: var(--vp-c-text-3);
  font-size: 0.88rem;
}
.arcade-sort-note a {
  color: var(--accent);
  text-underline-offset: 3px;
}
</style>
