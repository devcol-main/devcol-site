<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Post } from '../posts.data'
import { links } from '../site'
import { prefersReducedMotion } from './gsap'
import Arrow from './Arrow.vue'
import HeroStatusCard from './HeroStatusCard.vue'

const props = defineProps<{ phrases: string[]; project: string; projectLink: string; latest: Post | null }>()

const rot = ref<HTMLElement>()
const backdrop = ref<HTMLElement>()
let cleanup: (() => void)[] = []

onMounted(() => {
  if (prefersReducedMotion()) return

  // Rotating pill: the width eases to the current phrase so the pill hugs each word.
  const el = rot.value
  const items = el ? Array.from(el.querySelectorAll<HTMLElement>('.rot-item')) : []
  if (el && items.length > 1) {
    let cur = 0
    let timer = 0
    const width = (i: number) => `${items[i].getBoundingClientRect().width}px`
    el.style.width = width(0)
    el.classList.add('is-live')
    const step = () => {
      const prev = items[cur]
      cur = (cur + 1) % items.length
      const next = items[cur]
      el.style.width = width(cur)
      prev.classList.remove('is-on')
      prev.classList.add('is-out')
      next.style.transition = 'none'
      next.classList.remove('is-out')
      void next.offsetWidth
      next.style.transition = ''
      next.classList.add('is-on')
    }
    const start = () => { if (!timer) timer = window.setInterval(step, 2800) }
    const stop = () => { clearInterval(timer); timer = 0 }
    const onVis = () => (document.hidden ? stop() : start())
    document.addEventListener('visibilitychange', onVis)
    document.fonts?.ready.then(() => { el.style.width = width(cur) })
    start()
    cleanup.push(() => { stop(); document.removeEventListener('visibilitychange', onVis) })
  }

  // Backdrop glow follows the mouse
  const bd = backdrop.value
  if (bd && window.matchMedia('(hover: hover)').matches) {
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = bd.getBoundingClientRect()
        if (r.bottom < 0) return
        bd.style.setProperty('--px', `${e.clientX - r.left}px`)
        bd.style.setProperty('--py', `${e.clientY - r.top}px`)
        bd.style.setProperty('--nx', (e.clientX / window.innerWidth).toFixed(3))
        bd.style.setProperty('--ny', (e.clientY / window.innerHeight).toFixed(3))
      })
    }
    window.addEventListener('pointermove', onMove, { passive: true })
    cleanup.push(() => { cancelAnimationFrame(raf); window.removeEventListener('pointermove', onMove) })
  }
})

onBeforeUnmount(() => {
  cleanup.forEach((fn) => fn())
  cleanup = []
})
</script>

<template>
  <section class="hero" aria-labelledby="hero-title">
    <div ref="backdrop" class="hero-backdrop" aria-hidden="true">
      <div class="hb-grid"></div>
      <div class="hb-orbs"><div class="hb-orb hb-orb-a"></div><div class="hb-orb hb-orb-b"></div><div class="hb-orb hb-orb-c"></div></div>
      <div class="hb-cursor"></div>
    </div>

    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow hero-in">
          <span class="pill-dot" aria-hidden="true"></span>
          <span ref="rot" class="rot" aria-live="off">
            <span class="sr-only">{{ props.phrases.join('. ') }}.</span>
            <span class="rot-track" aria-hidden="true">
              <span v-for="(p, i) in props.phrases" :key="p" class="rot-item" :class="i === 0 ? 'is-on' : ''">{{ p }}</span>
            </span>
          </span>
        </p>
        <h1 id="hero-title" class="hero-in"><span class="name">DevCol</span><span class="text">Development Collaboration</span></h1>
        <p class="tagline hero-in">One developer, one indie game, and a public record of how it gets built. DevLogs, project write-ups, and technical notes.</p>
        <div class="actions hero-in">
          <a class="btn brand" href="/projects/">See the Projects<span class="ico" aria-hidden="true"><Arrow kind="right" :width="1.6" /></span></a>
          <a class="btn alt" href="/blog/">Read the DevLog<span class="ico" aria-hidden="true"><Arrow kind="right" :width="1.6" /></span></a>
          <a class="arrow-link hero-tertiary" :href="links.discord">Join the Discord <Arrow kind="diag" /></a>
        </div>
      </div>

      <div class="hero-media hero-in">
        <div class="shell">
          <HeroStatusCard :project="project" :project-link="projectLink" :latest="latest" />
        </div>
      </div>
    </div>
  </section>
</template>
