<script setup lang="ts">
import ProjectCard from './ProjectCard.vue'
import { featured } from './projects'
import { data as posts } from './posts.data'
import { onMounted, ref } from 'vue'

const recent = posts.slice(0, 5)

const track = ref<HTMLElement>()
const atStart = ref(true)
const atEnd = ref(false)

function update() {
  const el = track.value
  if (!el) return
  atStart.value = el.scrollLeft <= 4
  atEnd.value = el.scrollLeft + el.clientWidth >= el.scrollWidth - 4
}

// Move by one card so the next one snaps into view.
function slide(dir: 1 | -1) {
  const el = track.value
  const card = el?.querySelector<HTMLElement>('.project-card')
  if (!el || !card) return
  const gap = parseFloat(getComputedStyle(el).columnGap) || 0
  el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: 'smooth' })
}

onMounted(update)
</script>

<template>
  <div class="home-sections">
    <section class="hs-block">
      <header class="pg-head hs-head">
        <h2>Featured Projects</h2>
        <div class="hs-nav">
          <button type="button" aria-label="Previous projects" :disabled="atStart" @click="slide(-1)">←</button>
          <button type="button" aria-label="Next projects" :disabled="atEnd" @click="slide(1)">→</button>
          <a href="/projects/" class="hs-more">All Projects →</a>
        </div>
      </header>
      <div class="hs-slider">
        <div ref="track" class="hs-projects" @scroll.passive="update">
          <ProjectCard v-for="it in featured" :key="it.href" :item="it" />
        </div>
        <button v-show="!atStart" type="button" class="hs-edge prev" aria-label="Previous projects" @click="slide(-1)">←</button>
        <button v-show="!atEnd" type="button" class="hs-edge next" aria-label="Next projects" @click="slide(1)">→</button>
      </div>
    </section>

    <section class="hs-block">
      <header class="pg-head hs-head">
        <h2>Latest from the DevLog</h2>
        <a href="/blog/" class="hs-more">All Posts →</a>
      </header>
      <ul class="hs-posts">
        <li v-for="p in recent" :key="p.link">
          <a :href="p.link">
            <time :datetime="p.date">{{ p.date }}</time>
            <span class="hs-title">{{ p.title }}</span>
            <span v-if="p.description" class="hs-desc">{{ p.description }}</span>
          </a>
        </li>
      </ul>
    </section>
  </div>
</template>
