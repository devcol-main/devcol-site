<script setup lang="ts">
import { computed, nextTick, onMounted, ref } from 'vue'
import ProjectCard from '../ProjectCard.vue'
import { allProjects, categories, projectsIn } from '../projects'
import Arrow from './Arrow.vue'
import { loadGsap, prefersReducedMotion } from './gsap'

const filter = ref('All')
const shown = computed(() => {
  const c = categories.find((c) => c.label === filter.value)
  return c ? projectsIn(c.groups) : allProjects
})

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
  el.scrollBy({ left: dir * (card.offsetWidth + gap), behavior: prefersReducedMotion() ? 'auto' : 'smooth' })
}

async function pick(label: string) {
  filter.value = label
  await nextTick()
  track.value?.scrollTo({ left: 0 })
  update()
  const el = track.value
  if (!el || prefersReducedMotion()) return
  const { gsap } = await loadGsap()
  gsap.fromTo(Array.from(el.children), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease: 'power3.out', stagger: 0.06, clearProps: 'transform,opacity', overwrite: 'auto' })
}

onMounted(() => {
  update()
  window.addEventListener('resize', update)
})
</script>

<template>
  <section id="projects" class="section tight-top zone-projects" data-bg="paper" aria-labelledby="fp-title">
    <div class="wrap">
      <header class="fp-head">
        <div>
          <p class="sec-label">Browse</p>
          <h2 id="fp-title" class="h2 rv-title">Featured Projects</h2>
        </div>
        <div class="hs-nav">
          <button type="button" aria-label="Previous projects" :disabled="atStart" @click="slide(-1)"><Arrow kind="left" /></button>
          <button type="button" aria-label="Next projects" :disabled="atEnd" @click="slide(1)"><Arrow kind="right" /></button>
          <a href="/projects/" class="hs-more">All projects &rarr;</a>
        </div>
      </header>
      <div class="hs-filters" role="tablist" aria-label="Filter projects">
        <button
          v-for="label in ['All', ...categories.map((c) => c.label)]"
          :key="label"
          type="button"
          role="tab"
          :aria-selected="filter === label"
          :class="{ active: filter === label }"
          @click="pick(label)"
        >
          {{ label }}
        </button>
      </div>
      <div class="hs-slider">
        <div ref="track" class="hs-projects" @scroll.passive="update">
          <ProjectCard v-for="it in shown" :key="it.href" :item="it" />
        </div>
        <button v-show="!atStart" type="button" class="hs-edge prev" aria-label="Previous projects" @click="slide(-1)"><Arrow kind="left" /></button>
        <button v-show="!atEnd" type="button" class="hs-edge next" aria-label="Next projects" @click="slide(1)"><Arrow kind="right" /></button>
      </div>
    </div>
  </section>
</template>
