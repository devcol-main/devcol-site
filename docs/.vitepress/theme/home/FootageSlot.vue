<script setup lang="ts">
import { computed } from 'vue'
import { footage } from '../site'

const props = defineProps<{ project: string; tags: string[] }>()
// Drop your own footage in site.ts (footage.src / footage.poster); the placeholder hides itself once a video is present.
const short = (t: string) => t.replace('Unreal Engine 5', 'UE5')
// 'UE5 multiplayer' from ['Unreal Engine 5', 'Multiplayer']
const kind = computed(() => props.tags.map((t, i) => (i === 0 ? short(t) : t.toLowerCase())).join(' '))
const initials = computed(() => props.project.split(/\s+/).map((w) => w[0]).join('').toUpperCase())
</script>

<template>
  <section class="section tight-top zone-footage" :aria-label="`${project} footage`">
    <div class="slot-wrap">
      <figure class="slot">
        <div class="slot-frame has-ticks">
          <video v-if="footage.src" :src="footage.src" :poster="footage.poster" class="auto" muted loop playsinline preload="metadata"></video>
          <div class="slot-ph" aria-hidden="true">
            <div class="gridfx"></div>
            <div class="noise"></div>
            <div class="sweep"></div>
            <span class="corner tl mono">{{ initials }} / gameplay</span>
            <span class="corner tr mono">16:9</span>
            <span class="corner bl mono">{{ short(tags[0] ?? '') }}</span>
            <span class="corner br mono">00:00:00</span>
            <div class="center">
              <span class="play"><svg width="18" height="18" viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill="currentColor" /></svg></span>
              <span class="label mono">{{ project }} footage · coming soon</span>
            </div>
          </div>
          <span class="ticks on" aria-hidden="true"></span>
        </div>
        <figcaption class="slot-cap mono"><span>{{ project }}</span><span>{{ kind }}, in development</span></figcaption>
      </figure>
    </div>
  </section>
</template>
