<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { Post, ProjectGroup } from '../posts.data'
import type { Note } from '../study.data'
import Arrow from './Arrow.vue'
import { loadGsap, prefersReducedMotion } from './gsap'

const props = defineProps<{ posts: Post[]; projects: ProjectGroup[]; notes: Note[] }>()

// Filter tabs: every project heading from blog/index.md that has at least one post.
const tabs = computed(() => [
  { name: 'All', count: props.posts.length },
  ...props.projects.filter((p) => p.posts.length).map((p) => ({ name: p.name, count: p.posts.length })),
])
const filter = ref('All')
const list = computed(() => (filter.value === 'All' ? props.posts : props.posts.filter((p) => p.project === filter.value)))
// The newest post with an image gets the big card; the next six go in the list.
const feat = computed(() => list.value.find((p) => p.image) ?? list.value[0])
const rows = computed(() => list.value.filter((p) => p !== feat.value).slice(0, 6))

// Four study notes: the newest Unreal Engine notes (last in index order), else the first four.
const studyNotes = computed(() => {
  const ue = props.notes.filter((n) => n.group === 'Unreal Engine')
  return (ue.length >= 4 ? ue.slice(-4).reverse() : props.notes.slice(0, 4))
})

const listEl = ref<HTMLElement>()
async function pick(name: string) {
  filter.value = name
  await nextTick()
  if (!listEl.value || prefersReducedMotion()) return
  const { gsap } = await loadGsap()
  gsap.fromTo(Array.from(listEl.value.querySelectorAll('.dl-feat, .posts li')), { y: 10, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, ease: 'power3.out', stagger: 0.04, clearProps: 'transform,opacity', overwrite: 'auto' })
}
</script>

<template>
  <section id="devlog" class="section gridded zone-log" data-bg="paper" aria-labelledby="dl-title">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <p class="sec-label">DevLog</p>
          <h2 id="dl-title" class="h2 rv-title">Latest posts</h2>
        </div>
        <a class="arrow-link" href="/blog/">All {{ posts.length }} posts <Arrow kind="right" /></a>
      </div>
      <div class="dl-tabs rv" role="group" aria-label="Filter by project">
        <button v-for="t in tabs" :key="t.name" type="button" class="tab" :aria-pressed="filter === t.name" @click="pick(t.name)">
          {{ t.name }}<span class="n">{{ t.count }}</span>
        </button>
      </div>
      <div ref="listEl" class="dl">
        <a v-if="feat" class="dl-feat has-ticks rv" :href="feat.link">
          <span class="ticks" aria-hidden="true"></span>
          <div class="img">
            <picture v-if="feat.image">
              <source v-if="feat.imageDark" :srcset="feat.imageDark" media="(prefers-color-scheme: dark)" />
              <img :src="feat.image" alt="" loading="lazy" />
            </picture>
          </div>
          <div class="body">
            <p class="meta mono"><time :datetime="feat.date">{{ feat.date }}</time><span>{{ feat.project }}</span></p>
            <h3>{{ feat.title }}</h3>
            <p v-if="feat.description" class="desc">{{ feat.description }}</p>
          </div>
        </a>
        <ol class="posts">
          <li v-for="p in rows" :key="p.link" class="rv">
            <a :href="p.link">
              <time class="mono" :datetime="p.date">{{ p.date }}</time>
              <span class="t">{{ p.title }}<span class="pj mono">{{ p.project }}</span></span>
              <Arrow kind="right" />
            </a>
          </li>
        </ol>
      </div>

      <div class="study-head rv">
        <div>
          <p class="sec-label">Study</p>
          <p class="lede">Short notes I wanted to keep.</p>
        </div>
        <a class="arrow-link" href="/study/">All {{ notes.length }} notes <Arrow kind="right" /></a>
      </div>
      <ul class="notes">
        <li v-for="n in studyNotes" :key="n.link" class="rv">
          <a class="note has-ticks" :href="n.link">
            <span class="ticks" aria-hidden="true"></span>
            <span class="mono">{{ n.group }}</span>
            <h3>{{ n.title }}</h3>
            <Arrow kind="right" />
          </a>
        </li>
      </ul>
    </div>
  </section>
</template>
