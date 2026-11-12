<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { data as blog } from './posts.data'
import type { Post } from './posts.data'

// DevLog index: one card grid per project, newest first. Data comes from blog/index.md (see posts.data.ts).
const projectCover: Record<string, string> = { 'Arcade Web': '/projects/arcade-web-cover.jpg' }

const active = ref('All')
const filters = ['All', ...blog.projects.filter((g) => g.posts.length).map((g) => g.name)]
// Topic chips: tags used on at least 4 posts, most used first. `?tag=Debugging` in the URL preselects one.
const counts = new Map<string, number>()
for (const p of blog.posts) for (const t of p.tags) counts.set(t, (counts.get(t) ?? 0) + 1)
const topics = ['All', ...[...counts].filter(([, n]) => n >= 4).sort((a, b) => b[1] - a[1]).map(([t]) => t)]
const topic = ref('All')
const readTag = () => {
  const t = new URLSearchParams(window.location.search).get('tag')
  topic.value = t && counts.has(t) ? t : 'All'
}
const setTopic = (t: string) => {
  topic.value = t
  const url = new URL(window.location.href)
  if (t === 'All') url.searchParams.delete('tag')
  else url.searchParams.set('tag', t)
  history.replaceState(history.state, '', url)
}
// The nav's "Debugging Notes" link changes only the query, so the page isn't remounted: re-read it on each route change.
onMounted(() => {
  readTag()
  window.addEventListener('devcol:route', readTag)
  window.addEventListener('popstate', readTag)
})
onBeforeUnmount(() => {
  window.removeEventListener('devcol:route', readTag)
  window.removeEventListener('popstate', readTag)
})

const groups = computed(() =>
  blog.projects
    .filter((g) => active.value === 'All' || g.name === active.value)
    .map((g) => ({ ...g, posts: topic.value === 'All' ? g.posts : g.posts.filter((p) => p.tags.includes(topic.value)) }))
    .filter((g) => g.posts.length),
)
const shown = computed(() => groups.value.reduce((n, g) => n + g.posts.length, 0))
const latest = blog.latest?.link

const anchor = (name: string) => name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
const thumb = (p: Post) => p.image || projectCover[p.project] || ''
const initials = (name: string) => name.replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean).slice(0, 2).map((w) => w[0].toUpperCase()).join('')
const fmt = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' })
</script>

<template>
  <div class="projects-page blog-page">
    <header class="projects-hero">
      <p class="eyebrow">DevLog</p>
      <h1>Progress notes, bug hunts, and what each one taught me.</h1>
      <p class="lede">
        Write-ups from building PSEUDO, Tumble Teams, the Arcade Web games, and this site. {{ blog.total }} posts so far, newest first within each project.
      </p>
    </header>

    <div class="blog-filters" role="group" aria-label="Filter posts by project">
      <button
        v-for="f in filters"
        :key="f"
        type="button"
        class="blog-chip"
        :aria-pressed="active === f"
        @click="active = f"
      >{{ f }}</button>
    </div>
    <div class="blog-filters blog-topics" role="group" aria-label="Filter posts by topic">
      <span class="blog-filter-label mono">Topic</span>
      <button
        v-for="t in topics"
        :key="t"
        type="button"
        class="blog-chip"
        :aria-pressed="topic === t"
        @click="setTopic(t)"
      >{{ t }}<span v-if="t !== 'All'" class="blog-chip-count">{{ counts.get(t) }}</span></button>
    </div>
    <p v-if="topic !== 'All'" class="blog-filter-note">{{ shown }} {{ shown === 1 ? 'post' : 'posts' }} tagged {{ topic }}.</p>

    <section v-for="g in groups" :key="g.name" class="pg-group">
      <header class="pg-head">
        <h2 :id="anchor(g.name)">{{ g.name }}</h2>
        <p v-if="g.description">{{ g.description }}</p>
        <a v-if="g.link !== '/blog/'" class="blog-overview" :href="g.link">Overview &rarr;</a>
      </header>
      <div class="pg-cards">
        <a v-for="p in g.posts" :key="p.link" :href="p.link" class="project-card post-card spot has-ticks">
          <span class="ticks" aria-hidden="true"></span>
          <div class="thumb">
            <template v-if="thumb(p)">
              <img :src="thumb(p)" alt="" loading="lazy" :class="{ 'img-light': p.imageDark }" />
              <img v-if="p.imageDark" :src="p.imageDark" alt="" loading="lazy" class="img-dark" />
            </template>
            <div v-else class="thumb-fallback post-fallback" aria-hidden="true">
              <span class="pf-project mono">{{ p.project }}</span>
              <span class="pf-mark">{{ p.devlog ? p.devlog.replace('DevLog ', '') : initials(p.project) }}</span>
              <span class="pf-tag mono">{{ p.tags[0] ?? 'DevLog' }}</span>
            </div>
            <span v-if="p.link === latest" class="badge"><span class="live-dot" aria-hidden="true"></span>Latest</span>
          </div>
          <div class="body">
            <p class="post-meta mono"><time :datetime="p.date">{{ fmt(p.date) }}</time></p>
            <h3>{{ p.title }}</h3>
            <p v-if="p.description" class="post-desc">{{ p.description }}</p>
            <ul v-if="p.tags.length" class="tags">
              <li v-for="t in p.tags" :key="t">{{ t }}</li>
            </ul>
          </div>
        </a>
      </div>
    </section>
  </div>
</template>
