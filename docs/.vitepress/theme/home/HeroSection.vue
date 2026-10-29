<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { links } from '../site'
import { prefersReducedMotion } from './gsap'
import Arrow from './Arrow.vue'
import LogoMark from '../LogoMark.vue'

const props = defineProps<{ phrases: string[] }>()

const rot = ref<HTMLElement>()
const section = ref<HTMLElement>()
const coords = ref('x 0000 · y 0000')
let cleanup: (() => void)[] = []

onMounted(() => {
  if (prefersReducedMotion()) return

  // Rotating line: the width eases to the current phrase.
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

  // Pointer over the hero: the coordinate readout, and the hook leans toward the pointer once the logo has landed.
  const sec = section.value
  if (sec && window.matchMedia('(hover: hover) and (pointer: fine)').matches) {
    let raf = 0
    const onMove = (e: PointerEvent) => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const r = sec.getBoundingClientRect()
        const x = Math.round(e.clientX - r.left), y = Math.round(e.clientY - r.top)
        coords.value = `x ${String(x).padStart(4, '0')} · y ${String(y).padStart(4, '0')}`
        const mark = sec.querySelector<SVGSVGElement>('.mark.landed')
        const sway = mark?.querySelector<SVGGElement>('.sway')
        if (!mark || !sway) return
        const m = mark.getBoundingClientRect()
        const px = m.left + m.width * ((145 - 44) / 158), py = m.top
        const a = (Math.atan2(e.clientX - px, Math.max(40, e.clientY - py)) * 180) / Math.PI
        sway.style.transform = `rotate(${Math.max(-7, Math.min(7, a * 0.12))}deg)`
      })
    }
    const onLeave = () => { sec.querySelector<SVGGElement>('.mark .sway')?.style.removeProperty('transform') }
    sec.addEventListener('pointermove', onMove, { passive: true })
    sec.addEventListener('pointerleave', onLeave)
    cleanup.push(() => { cancelAnimationFrame(raf); sec.removeEventListener('pointermove', onMove); sec.removeEventListener('pointerleave', onLeave) })
  }
})

onBeforeUnmount(() => {
  cleanup.forEach((fn) => fn())
  cleanup = []
})
</script>

<template>
  <section ref="section" class="hero gridded" data-bg="paper" aria-labelledby="hero-title">
    <div class="wrap hero-grid">
      <div class="hero-copy">
        <p class="eyebrow mono hero-in">
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
      <div class="hero-media hero-in mark-wrap lift-on-hover" aria-hidden="true">
        <LogoMark id="hero" mode="drop" />
      </div>
    </div>
    <p class="coords mono" aria-hidden="true">{{ coords }}</p>
  </section>
</template>
