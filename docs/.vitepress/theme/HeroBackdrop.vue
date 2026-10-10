<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'

const root = ref<HTMLElement | null>(null)
let raf = 0

function onMove(e: PointerEvent) {
  if (!root.value) return
  cancelAnimationFrame(raf)
  raf = requestAnimationFrame(() => {
    const r = root.value!.getBoundingClientRect()
    root.value!.style.setProperty('--px', `${e.clientX - r.left}px`)
    root.value!.style.setProperty('--py', `${e.clientY - r.top}px`)
  })
}

onMounted(() => {
  if (window.matchMedia('(hover: hover) and (prefers-reduced-motion: no-preference)').matches) {
    window.addEventListener('pointermove', onMove, { passive: true })
  }
})
onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onMove)
  cancelAnimationFrame(raf)
})
</script>

<template>
  <div ref="root" class="hero-backdrop" aria-hidden="true">
    <div class="hb-grid"></div>
    <div class="hb-orb hb-orb-a"></div>
    <div class="hb-orb hb-orb-b"></div>
    <div class="hb-cursor"></div>
  </div>
</template>
