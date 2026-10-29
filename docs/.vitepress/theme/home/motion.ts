import { loadGsap } from './gsap'

// All scroll animation for the home page. Everything is created inside one gsap.context scoped to the
// page root, so the returned cleanup kills every ScrollTrigger and undoes inline styles when the route changes.
export async function initHomeMotion(root: HTMLElement): Promise<() => void> {
  const { gsap, ScrollTrigger } = await loadGsap()
  const all = <T extends Element = HTMLElement>(sel: string) => Array.from(root.querySelectorAll<T>(sel))
  const one = <T extends Element = HTMLElement>(sel: string) => root.querySelector<T>(sel)
  const ease = 'power3.out'

  // Scrubbed transforms stay 3D (force3D) so GSAP doesn't flip them between 2D and 3D on every scroll tick.
  // will-change is only set while a trigger is active.
  const layerWhileActive = (...els: (Element | null)[]) => (self: { isActive: boolean }) =>
    els.forEach((el) => el?.classList.toggle('is-scrubbing', self.isActive))

  let refreshTimer = 0
  const refresh = () => {
    cancelAnimationFrame(refreshTimer)
    refreshTimer = requestAnimationFrame(() => ScrollTrigger.refresh())
  }

  const ctx = gsap.context(() => {
    // Hero intro, then the copy lifts and dims while the logo drifts slower
    gsap.fromTo(all('.hero-in'), { y: 36, opacity: 0 }, { y: 0, opacity: 1, duration: 1.1, ease, stagger: 0.1, delay: 0.05, clearProps: 'transform,opacity' })
    const heroCopy = one('.hero-copy')
    const heroMedia = one('.hero-media')
    gsap.fromTo(heroCopy, { y: 0, opacity: 1 }, { y: -60, opacity: 0.25, ease: 'none', force3D: true, immediateRender: false, scrollTrigger: { trigger: one('.hero'), start: 'top top', end: 'bottom top', scrub: true, onToggle: layerWhileActive(heroCopy) } })
    gsap.fromTo(heroMedia, { y: 0 }, { y: -30, ease: 'none', force3D: true, immediateRender: false, scrollTrigger: { trigger: one('.hero'), start: 'top top', end: 'bottom top', scrub: true, onToggle: layerWhileActive(heroMedia) } })

    // Section titles
    all('.rv-title').forEach((el) => {
      gsap.fromTo(el, { y: 28, opacity: 0 }, { y: 0, opacity: 1, duration: 0.7, ease, clearProps: 'transform,opacity', scrollTrigger: { trigger: el, start: 'top bottom+=80' } })
    })

    // Staggered reveals for cards and rows
    const rv = all('.rv')
    gsap.set(rv, { y: 24, opacity: 0 })
    ScrollTrigger.batch(rv, {
      start: 'top bottom+=80',
      once: true,
      onEnter: (batch) => { gsap.to(batch, { y: 0, opacity: 1, duration: 0.6, ease, stagger: 0.05, clearProps: 'transform,opacity' }) },
    })
    const slider = one('.hs-projects')
    if (slider) gsap.fromTo(Array.from(slider.children), { y: 24, opacity: 0 }, { y: 0, opacity: 1, duration: 0.6, ease, stagger: 0.05, clearProps: 'transform,opacity', scrollTrigger: { trigger: slider, start: 'top bottom+=80' } })

    // Word-by-word scrubs (About text, reel title; the logo pill counts as one word)
    const scrub = one('.scrub')
    if (scrub) {
      gsap.fromTo(Array.from(scrub.querySelectorAll('.wd')), { opacity: 0.22 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: scrub, start: 'top 80%', end: 'bottom 45%', scrub: true } })
    }
    const reel = one('.reel-title')
    if (reel) {
      gsap.fromTo(Array.from(reel.querySelectorAll('.wd')), { opacity: 0.22 }, { opacity: 1, stagger: 0.1, ease: 'none', scrollTrigger: { trigger: reel, start: 'top 85%', end: 'bottom 50%', scrub: true } })
    }

    // Reel: the logo in the pill assembles as the section scrolls toward the middle of the screen.
    // The lift group moves in SVG user units; the patches hide once the pieces meet.
    const lift = one<SVGGElement>('.inline-media .mark .lift')
    const patches = all<SVGPathElement>('.inline-media .mark .patch')
    if (lift) {
      gsap.fromTo(lift, { y: -190 }, {
        y: 0,
        ease: 'none',
        scrollTrigger: {
          trigger: one('.reel'),
          start: 'top 90%',
          end: 'center 50%',
          scrub: true,
          onUpdate: (self) => patches.forEach((p) => (p.style.opacity = self.progress > 0.985 ? '0' : '1')),
        },
      })
    }

    // Selected work: each card settles in, then recedes while the next one covers it
    const cards = all('.card')
    const stickTop = (el: HTMLElement) => parseFloat(getComputedStyle(el).top) || 0
    cards.forEach((c, i) => {
      const inner = c.querySelector<HTMLElement>('.card-in')
      const par = c.querySelector<HTMLElement>('.frame:not(.contain) .par')
      if (par) gsap.fromTo(par, { scale: 1.14 }, { scale: 1, ease: 'none', force3D: true, scrollTrigger: { trigger: c, start: 'top bottom', end: 'top 30%', scrub: true, onToggle: layerWhileActive(par) } })
      const next = cards[i + 1]
      if (!next || !inner) return
      gsap.timeline({
        scrollTrigger: {
          trigger: next,
          scrub: true,
          invalidateOnRefresh: true,
          onToggle: layerWhileActive(inner),
          start: () => `top ${stickTop(c) + c.offsetHeight}px`,
          end: () => `top ${stickTop(next)}px`,
        },
      })
        .to(inner, { scale: 0.94, ease: 'none', force3D: true }, 0)
        .to(inner.querySelector('.shade'), { opacity: 0.5, ease: 'none' }, 0)
    })

    // Contact band scales in
    const band = one('.rv-band')
    if (band) gsap.fromTo(band, { scale: 0.94, opacity: 0.5 }, { scale: 1, opacity: 1, ease: 'none', force3D: true, scrollTrigger: { trigger: band, start: 'top bottom', end: 'top 50%', scrub: true, onToggle: layerWhileActive(band) } })

    // The page colour follows the section nearest the middle of the screen (data-bg = paper | paper-2 | paper-3).
    all('[data-bg]').forEach((sec) => {
      ScrollTrigger.create({
        trigger: sec,
        start: 'top 50%',
        end: 'bottom 50%',
        onToggle: (self) => { if (self.isActive) document.body.style.backgroundColor = `var(--${sec.dataset.bg})` },
      })
    })
  }, root)

  // Fonts and images change layout, so recompute trigger positions once they settle.
  if (document.readyState === 'complete') refresh()
  else window.addEventListener('load', refresh, { once: true })
  document.fonts?.ready.then(refresh)

  return () => {
    cancelAnimationFrame(refreshTimer)
    window.removeEventListener('load', refresh)
    document.body.style.removeProperty('background-color')
    ctx.revert()
  }
}
