import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme-without-fonts'
import { useRoute } from 'vitepress'
import { h, nextTick, onMounted, watch } from 'vue'
import '@fontsource-variable/archivo/wdth.css'
import '@fontsource/ibm-plex-mono/400.css'
import '@fontsource/ibm-plex-mono/500.css'
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
import LogoMark from './LogoMark.vue'

// Projects page: cards fade up once as they scroll in, then drop the class so hover feels instant.
const REVEAL = '.projects-page .project-card, .projects-page .pg-head, .projects-hero, .blog-filters'

let observer: IntersectionObserver | undefined

const fine = () => window.matchMedia('(hover: hover) and (pointer: fine)').matches
const reduce = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches

function initReveal() {
  if (typeof window === 'undefined') return
  observer?.disconnect()
  if (reduce()) return
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
  if (!fine() || reduce()) return
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

// Graph-paper surfaces (.gridded): the lines darken in a circle around the pointer. One write per frame.
function initGridded() {
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
        const el = (ev?.target as Element | null)?.closest?.<HTMLElement>('.gridded')
        if (!el || !ev) return
        const r = el.getBoundingClientRect()
        el.style.setProperty('--mx', `${ev.clientX - r.left}px`)
        el.style.setProperty('--my', `${ev.clientY - r.top}px`)
      })
    },
    { passive: true },
  )
}

// Crosshair cursor over anything clickable: four arms that breathe apart and together, spread on click.
// Black or white, chosen by the brightness of the painted background under the pointer.
function initCrosshair() {
  if (!fine() || reduce()) return
  const el = document.createElement('div')
  el.className = 'xcur'
  el.setAttribute('aria-hidden', 'true')
  el.innerHTML = '<span class="arm a1"></span><span class="arm a2"></span><span class="arm a3"></span><span class="arm a4"></span><span class="dot"></span>'
  document.body.appendChild(el)
  document.documentElement.classList.add('xcur-on')
  const HOT = 'a, button, [role="button"], .card-link, .project-card, .feature, .VPSwitch, summary'
  const isHot = (t: EventTarget | null) => !!(t as Element | null)?.closest?.(HOT)
  const lum = (start: Element | null) => {
    for (let n = start; n && n !== document.documentElement; n = n.parentElement) {
      if (/^(IMG|VIDEO|CANVAS|IFRAME)$/.test(n.tagName)) return 0.2
      const m = getComputedStyle(n).backgroundColor.match(/[\d.]+/g)
      if (m && (m.length < 4 || Number(m[3]) > 0.5)) return (0.2126 * Number(m[0]) + 0.7152 * Number(m[1]) + 0.0722 * Number(m[2])) / 255
    }
    const b = getComputedStyle(document.body).backgroundColor.match(/[\d.]+/g)
    return b ? (0.2126 * Number(b[0]) + 0.7152 * Number(b[1]) + 0.0722 * Number(b[2])) / 255 : 1
  }
  let live = false
  let kick = 0
  document.addEventListener(
    'pointermove',
    (e) => {
      if (e.pointerType && e.pointerType !== 'mouse') return
      el.style.transform = `translate(${e.clientX}px, ${e.clientY}px)`
      const hot = isHot(e.target)
      if (hot !== live) {
        live = hot
        el.classList.toggle('on', hot)
      }
      if (hot) el.classList.toggle('light', lum(e.target as Element) < 0.5)
    },
    { passive: true },
  )
  document.addEventListener('pointerdown', () => { kick = 1 })
  document.addEventListener('pointerleave', () => { live = false; el.classList.remove('on') })
  const breathe = (t: number) => {
    if (live) {
      kick *= 0.9
      const gap = 4 + (Math.sin((t / 1000) * 2.2) + 1) * 2.5 + kick * 10
      el.style.setProperty('--gap', `${gap.toFixed(2)}px`)
    }
    requestAnimationFrame(breathe)
  }
  requestAnimationFrame(breathe)
}

// Reading progress: a red line under the nav bar.
function initProgress() {
  const bar = document.createElement('div')
  bar.className = 'read-progress'
  bar.setAttribute('aria-hidden', 'true')
  document.body.appendChild(bar)
  let raf = 0
  const update = () => {
    raf = 0
    const max = document.documentElement.scrollHeight - window.innerHeight
    bar.style.setProperty('--p', max > 0 ? String(Math.min(1, window.scrollY / max)) : '0')
  }
  const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  update()
}

export default {
  extends: DefaultTheme,
  Layout() {
    return h(DefaultTheme.Layout, null, {
      // The animated mark replaces the png in the nav (the img is hidden in custom.css).
      'nav-bar-title-before': () => h(LogoMark, { id: 'nav', mode: 'drop', class: 'nav-mark' }),
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
      initGridded()
      initCrosshair()
      initProgress()
    })
    watch(
      () => route.path,
      () => nextTick(initReveal),
    )
  },
} satisfies Theme
