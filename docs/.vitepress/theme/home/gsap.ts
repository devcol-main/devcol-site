// GSAP is loaded in the browser only, on demand, so SSR and the static HTML never touch it.
type GsapModules = { gsap: typeof import('gsap').gsap; ScrollTrigger: typeof import('gsap/ScrollTrigger').ScrollTrigger }

let loading: Promise<GsapModules> | undefined

export function loadGsap(): Promise<GsapModules> {
  loading ??= Promise.all([import('gsap'), import('gsap/ScrollTrigger')]).then(([g, s]) => {
    g.gsap.registerPlugin(s.ScrollTrigger)
    return { gsap: g.gsap, ScrollTrigger: s.ScrollTrigger }
  })
  return loading
}

export const prefersReducedMotion = () =>
  typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
