<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

// Bottom-right "back to top" button. Shows after the first screen.
const SHOW_AFTER = 600

const visible = ref(false)
let raf = 0

function update() {
  raf = 0
  visible.value = window.scrollY > SHOW_AFTER
}
const onScroll = () => { if (!raf) raf = requestAnimationFrame(update) }

function toTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
  // Move keyboard focus back to the top of the page too.
  document.querySelector<HTMLElement>('.VPNavBarTitle a, #VPContent')?.focus({ preventScroll: true })
}

onMounted(() => {
  window.addEventListener('scroll', onScroll, { passive: true })
  window.addEventListener('resize', onScroll, { passive: true })
  update()
})
onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  window.removeEventListener('scroll', onScroll)
  window.removeEventListener('resize', onScroll)
})
</script>

<template>
  <button
    type="button"
    class="back-to-top"
    :class="{ on: visible }"
    :tabindex="visible ? 0 : -1"
    :aria-hidden="!visible"
    aria-label="Back to top"
    title="Back to top"
    @click="toTop"
  >
    <svg class="btt-arrow" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 19V5M6 11l6-6 6 6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </button>
</template>
