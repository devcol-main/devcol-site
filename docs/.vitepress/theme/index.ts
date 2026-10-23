import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import { useRoute } from 'vitepress'
import { h, nextTick, onMounted, watch } from 'vue'
import '@fontsource-variable/geist'
import '@fontsource-variable/space-grotesk'
import '@fontsource-variable/jetbrains-mono'
import '@fontsource/outfit/700.css'
import './custom.css'
import './home/home.css'
import HomePage from './home/HomePage.vue'
import ProjectGrid from './ProjectGrid.vue'
import GameFrame from './GameFrame.vue'
import SiteFooter from './SiteFooter.vue'
import BackToTop from './BackToTop.vue'
import BlogIndex from './BlogIndex.vue'
import SiteStats from './SiteStats.vue'
import PostByline from './PostByline.vue'

// Projects page: cards fade up once as they scroll in, then drop the class so hover feels instant.
const REVEAL = '.projects-page .project-card, .projects-page .pg-head, .projects-hero, .blog-filters'

let observer: IntersectionObserver | undefined

function initReveal() {
  if (typeof window === 'undefined') return
  observer?.disconnect()
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        const el = entry.target as HTMLElement
        el.classList.add('is-visible')
        observer?.unobserve(el)
        const done = () => el.classList.remove('reveal', 'is-visible')
        el.addEventListener('transitionend', done, { once: true })
        setTimeout(done, 1200)
      }
    },
    { rootMargin: '0px 0px 12% 0px', threshold: 0 },
  )
  document.querySelectorAll<HTMLElement>(REVEAL).forEach((el, i) => {
    el.classList.add('reveal')
    el.style.setProperty('--reveal-delay', `${(i % 4) * 70}ms`)
    observer!.observe(el)
  })
}

// One shared pill slides behind whichever nav link is hovered or focused (fine pointers, motion allowed).
function initNavPill() {
  const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches
  if (!fine || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return
  const TARGET = '.VPNavBarMenuLink, .VPNavBarMenuGroup'
  const menuOf = (el: Element) => el.closest<HTMLElement>('.VPNavBarMenu')
  const moveTo = (item: HTMLElement) => {
    const menu = menuOf(item)
    if (!menu) return
    menu.classList.add('has-pill')
    const fresh = !menu.classList.contains('pill-on')
    if (fresh) menu.classList.add('pill-instant')
    const m = menu.getBoundingClientRect()
    const r = item.getBoundingClientRect()
    menu.style.setProperty('--pill-x', `${r.left - m.left}px`)
    menu.style.setProperty('--pill-w', `${r.width}px`)
    if (fresh) {
      void menu.offsetWidth
      menu.classList.remove('pill-instant')
    }
    menu.classList.add('pill-on')
  }
  const off = (menu: Element | null) => menu?.classList.remove('pill-on')
  document.addEventListener('pointerover', (e) => {
    const item = (e.target as Element | null)?.closest<HTMLElement>(TARGET)
    if (item) moveTo(item)
  })
  document.addEventListener('focusin', (e) => {
    const item = (e.target as Element | null)?.closest<HTMLElement>(TARGET)
    if (item) moveTo(item)
  })
  document.addEventListener('pointerout', (e) => {
    const menu = menuOf(e.target as Element)
    if (menu && !menu.contains((e as PointerEvent).relatedTarget as Node | null)) off(menu)
  })
  document.addEventListener('focusout', (e) => {
    const menu = menuOf(e.target as Element)
    if (menu && !menu.contains((e as FocusEvent).relatedTarget as Node | null)) off(menu)
  })
}

// Card spotlight: one write per frame, only for the element under the mouse.
function initSpotlight() {
  let ev: PointerEvent | undefined
  let raf = 0
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      ev = e
      if (raf) return
      raf = requestAnimationFrame(() => {
        raf = 0
        const el = (ev?.target as Element | null)?.closest?.<HTMLElement>('.spot')
        if (!el || !ev) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${ev.clientX - r.left}px`)
        el.style.setProperty('--my', `${ev.clientY - r.top}px`)
      })
    },
    { passive: true },
  )
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      'doc-before': () => h(PostByline),
      'layout-bottom': () => [h(SiteFooter), h(BackToTop)],
    })
  },
  enhanceApp({ app, router }) {
    // Analytics (public/t.js): a page view per SPA route, plus page_leave for the previous page.
    // The title updates after the route change, so wait a tick before reading it.
    if (typeof window !== 'undefined') {
      router.onAfterRouteChanged = () => {
        nextTick(() => setTimeout(() => (window as { devcol?: { page(): void } }).devcol?.page(), 0))
      }
    }
    app.component('ProjectGrid', ProjectGrid)
    app.component('HomePage', HomePage)
    app.component('GameFrame', GameFrame)
    app.component('BlogIndex', BlogIndex)
    app.component('SiteStats', SiteStats)
  },
  setup() {
    const route = useRoute()
    onMounted(() => {
      initReveal()
      initNavPill()
      initSpotlight()
    })
    watch(
      () => route.path,
      () => nextTick(initReveal),
    )
  },
} satisfies Theme
