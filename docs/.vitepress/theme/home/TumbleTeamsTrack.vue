<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Post } from '../posts.data'
import Arrow from './Arrow.vue'

// "Now building" section plus the vertical build track. Everything comes from the blog index (newest first).
const props = defineProps<{ project: string; projectLink: string; blurb: string; tags: string[]; posts: Post[]; range: string }>()
const MAX = 8
const keys = props.posts.slice(0, MAX)
const words = props.project.split(' ')
const last = words.pop()
const lead = words.join(' ')

const rail = ref<HTMLElement>()
const loaded = ref(false)
let io: IntersectionObserver | undefined
onMounted(() => {
  if (!rail.value || !('IntersectionObserver' in window)) return void (loaded.value = true)
  io = new IntersectionObserver((en) => {
    if (en[0].isIntersecting) { loaded.value = true; io?.disconnect() }
  }, { threshold: 0.4 })
  io.observe(rail.value)
})
onBeforeUnmount(() => io?.disconnect())
</script>

<template>
  <section id="now-building" class="section tight-top zone-tt" data-bg="paper-2" aria-labelledby="tt-title">
    <div class="wrap tt-grid">
      <div class="tt-copy">
        <p class="buildbar mono rv">
          <span class="live">In development</span>
          <span v-for="t in tags" :key="t">{{ t }}</span>
        </p>
        <h2 id="tt-title" class="tt-title rv-title">
          <span class="pre">Now building</span>
          <span class="main"><template v-if="lead">{{ `${lead} ` }}</template><em>{{ last }}</em></span>
        </h2>
        <p class="tagline rv">{{ blurb || 'One developer, one indie game, and a public record of how it gets built.' }}</p>
        <div class="actions rv">
          <a class="arrow-link" :href="projectLink">About {{ project }} <Arrow kind="right" /></a>
          <a class="arrow-link" href="/blog/">Read the DevLog <Arrow kind="right" /></a>
        </div>
      </div>
      <aside id="rail" ref="rail" class="rail rv" :class="{ loaded }" aria-labelledby="rail-title">
        <div class="rail-head">
          <h2 id="rail-title">{{ project }} build track</h2>
          <span class="mono">{{ range }}</span>
        </div>
        <ol class="track">
          <li v-for="(p, i) in keys" :key="p.link" class="key" :class="{ now: i === 0 }" :style="{ '--i': i }">
            <span class="diamond" aria-hidden="true"></span>
            <a :href="p.link"><span class="k-title">{{ p.track }}</span><span class="k-date mono">{{ p.date }}{{ p.devlog ? ` · ${p.devlog}` : '' }}</span></a>
          </li>
        </ol>
        <div class="rail-foot">
          <a class="arrow-link" href="#devlog">Full build log <Arrow kind="right" /></a>
        </div>
      </aside>
    </div>
  </section>
</template>
