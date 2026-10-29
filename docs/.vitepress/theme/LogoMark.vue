<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { prefersReducedMotion } from './home/gsap'

// The DevCol mark drawn inline: two linked squares and the red crane hook behind them.
// mode 'drop'  — the hook lowers the back square onto the front one when mounted, then sways and settles.
// mode 'scrub' — nothing runs here; home/motion.ts drives .lift and .patch with the scroll position.
// mode 'still' — the finished logo.
// `id` keeps the two mask ids unique when several marks are on one page.
const props = withDefaults(defineProps<{ id: string; mode?: 'drop' | 'scrub' | 'still' }>(), { mode: 'still' })

const root = ref<SVGSVGElement>()
const cls = ref<string[]>(props.mode === 'scrub' ? ['scrubbed'] : [])
let cleanup: (() => void) | undefined

onMounted(() => {
  const el = root.value
  if (!el) return
  if (props.mode === 'scrub') return
  if (props.mode === 'still' || prefersReducedMotion()) {
    cls.value = ['landed']
    return
  }
  const lift = el.querySelector<SVGGElement>('.lift')
  const sway = el.querySelector<SVGGElement>('.sway')
  const onLift = (e: AnimationEvent) => { if (e.animationName === 'mark-drop') cls.value = [...cls.value, 'landed'] }
  const onSway = (e: AnimationEvent) => { if (e.animationName === 'mark-swing') cls.value = cls.value.filter((c) => c !== 'drop') }
  lift?.addEventListener('animationend', onLift)
  sway?.addEventListener('animationend', onSway)
  const raf = requestAnimationFrame(() => (cls.value = ['drop']))
  cleanup = () => {
    cancelAnimationFrame(raf)
    lift?.removeEventListener('animationend', onLift)
    sway?.removeEventListener('animationend', onSway)
  }
})
onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <svg ref="root" class="mark" :class="cls" viewBox="44 0 158 224" aria-hidden="true">
    <defs>
      <!-- Each square has a hole where the other passes over it; patches cover the holes until the pieces meet. -->
      <mask :id="`${id}-front-hole`" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="300">
        <rect x="0" y="0" width="300" height="300" fill="#fff" /><rect x="86" y="108" width="22" height="38" fill="#000" />
      </mask>
      <mask :id="`${id}-back-hole`" maskUnits="userSpaceOnUse" x="0" y="0" width="300" height="300">
        <rect x="0" y="0" width="300" height="300" fill="#fff" /><rect x="135" y="158" width="22" height="40" fill="#000" />
      </mask>
    </defs>
    <g fill="none" stroke="currentColor" stroke-width="15">
      <rect x="62" y="127" width="84" height="84" rx="13" :mask.attr="`url(#${id}-front-hole)`" />
      <path class="patch" d="M86 127h22" />
      <g class="sway">
        <g class="lift">
          <g stroke="var(--red)" stroke-width="5.5" stroke-linejoin="round" stroke-linecap="round">
            <path d="M145 20l8.7 5v10l-8.7 5-8.7-5V25z" />
            <path d="M145 40v5c7 1 9 8 4 12-3 2-8 1.5-10-2" />
            <path d="M145 58v10M145 68l-22 24M145 68l22 24" />
          </g>
          <rect x="97" y="92" width="84" height="86" rx="13" :mask.attr="`url(#${id}-back-hole)`" />
          <path class="patch" d="M135 178h22" />
        </g>
      </g>
    </g>
  </svg>
</template>
