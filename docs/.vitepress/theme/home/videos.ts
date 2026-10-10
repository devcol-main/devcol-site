import { prefersReducedMotion } from './gsap'

// Videos play only while on screen. Under prefers-reduced-motion they stay on their poster.
// data-start / data-end loop one segment (seconds), data-rate slows it down.
let io: IntersectionObserver | undefined

function observer() {
  io ??= new IntersectionObserver(
    (entries) => {
      for (const en of entries) {
        const v = en.target as HTMLVideoElement
        if (en.isIntersecting) v.play()?.catch(() => {})
        else v.pause()
      }
    },
    { threshold: 0.1 },
  )
  return io
}

export function watchVideo(v: HTMLVideoElement): () => void {
  v.muted = true
  if (prefersReducedMotion()) {
    v.pause()
    return () => {}
  }
  const ac = new AbortController()
  const opts = { signal: ac.signal }
  const a = parseFloat(v.dataset.start ?? '')
  const b = parseFloat(v.dataset.end ?? '')
  const rate = parseFloat(v.dataset.rate ?? '')
  if (!isNaN(a)) {
    const toStart = () => {
      try { v.currentTime = a } catch {}
    }
    v.addEventListener('loadedmetadata', () => {
      if (v.currentTime < a) toStart()
      if (rate) v.playbackRate = rate
    }, opts)
    v.addEventListener('play', () => { if (rate) v.playbackRate = rate }, opts)
    v.addEventListener('timeupdate', () => {
      if ((!isNaN(b) && v.currentTime >= b) || v.currentTime < a - 0.05) toStart()
    }, opts)
    v.addEventListener('ended', () => { toStart(); v.play()?.catch(() => {}) }, opts)
  }
  observer().observe(v)
  return () => {
    ac.abort()
    io?.unobserve(v)
  }
}
