<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { reel } from '../site'
import { watchVideo } from './videos'

const root = ref<HTMLElement>()
let stops: (() => void)[] = []

onMounted(() => {
  root.value?.querySelectorAll<HTMLVideoElement>('video').forEach((v) => stops.push(watchVideo(v)))
})
onBeforeUnmount(() => {
  stops.forEach((s) => s())
  stops = []
})

// Swap the footage in site.ts (reel.background and reel.pill). Keep the background ambient; the CSS darkens and softens it.
const before = ['Show', 'the', 'work']
const after = ['while', "it's", 'happening.']
</script>

<template>
  <section id="reel" ref="root" class="reel" aria-labelledby="reel-title">
    <div class="reel-bg" aria-hidden="true">
      <video
        class="reel-video"
        :src="`${reel.background.src}#t=${reel.background.start}`"
        :poster="reel.background.poster"
        :data-start="reel.background.start"
        :data-end="reel.background.end"
        :data-rate="reel.background.rate"
        muted
        playsinline
        preload="metadata"
      ></video>
    </div>
    <div class="wrap reel-inner">
      <h2 id="reel-title" class="reel-title">
        <template v-for="(w, i) in before" :key="`b${i}`"><span class="wd">{{ w }}</span>{{ i < before.length - 1 ? ' ' : '' }}</template><span class="inline-media" aria-hidden="true">
          <video
            :src="`${reel.pill.src}#t=${reel.pill.start}`"
            :poster="reel.pill.poster"
            :data-start="reel.pill.start"
            :data-end="reel.pill.end"
            muted
            playsinline
            preload="metadata"
          ></video></span>{{ ' ' }}<template v-for="(w, i) in after" :key="`a${i}`"><span class="wd">{{ w }}</span>{{ i < after.length - 1 ? ' ' : '' }}</template>
      </h2>
      <p class="reel-sub mono">DevLogs, including the mistakes.</p>
    </div>
  </section>
</template>
