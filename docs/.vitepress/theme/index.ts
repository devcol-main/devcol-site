import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { useRoute } from 'vitepress'
import { h, nextTick, onMounted, watch } from 'vue'
import '@fontsource-variable/inter'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import './custom.css'
import HeroBackdrop from './HeroBackdrop.vue'
import HeroCard from './HeroCard.vue'
import ProjectGrid from './ProjectGrid.vue'

const REVEAL = '.VPFeature, .project-card, .pg-head, .status-card, .projects-hero'
const SPOT = '.VPFeature, .project-card'

let observer: IntersectionObserver | undefined

function initMotion() {
  if (typeof window === 'undefined') return
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  observer?.disconnect()
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer?.unobserve(entry.target)
        }
      }
    },
    { rootMargin: '0px 0px -8% 0px', threshold: 0.05 },
  )
  document.querySelectorAll<HTMLElement>(REVEAL).forEach((el, i) => {
    el.classList.add('reveal')
    el.style.setProperty('--reveal-delay', `${(i % 4) * 70}ms`)
    observer!.observe(el)
  })
  document.querySelectorAll<HTMLElement>(SPOT).forEach((el) => el.classList.add('spot'))
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'home-hero-before': () => h(HeroBackdrop),
      'home-hero-image': () => h(HeroCard),
    })
  },
  enhanceApp({ app }) {
    app.component('ProjectGrid', ProjectGrid)
  },
  setup() {
    const route = useRoute()
    onMounted(() => {
      initMotion()
      document.addEventListener('pointermove', (e) => {
        const el = (e.target as HTMLElement | null)?.closest?.('.spot') as HTMLElement | null
        if (!el) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${e.clientX - r.left}px`)
        el.style.setProperty('--my', `${e.clientY - r.top}px`)
      })
    })
    watch(
      () => route.path,
      () => nextTick(initMotion),
    )
  },
} satisfies Theme
