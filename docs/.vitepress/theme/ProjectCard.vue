<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import type { Item } from './projects'
import { watchVideo } from './home/videos'

defineProps<{ item: Item }>()

const video = ref<HTMLVideoElement>()
let stop: (() => void) | undefined

// Plays only while on screen; clips with a start time loop from there (see home/videos.ts).
onMounted(() => { if (video.value) stop = watchVideo(video.value) })
onBeforeUnmount(() => stop?.())

function initials(title: string) {
  return title
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}
</script>

<template>
  <a :href="item.href" class="project-card spot has-ticks">
    <span class="ticks" aria-hidden="true"></span>
    <div class="thumb" :class="{ contain: item.fit === 'contain' }">
      <img v-if="item.img" :src="item.img" :alt="`${item.title} screenshot`" loading="lazy" />
      <video
        v-else-if="item.video"
        ref="video"
        :src="item.start ? `${item.video}#t=${item.start}` : item.video"
        :poster="item.poster"
        :data-start="item.start"
        :loop="!item.start"
        muted
        playsinline
        preload="metadata"
      ></video>
      <div v-else class="thumb-fallback">{{ initials(item.title) }}</div>
      <span v-if="item.badge" class="badge">{{ item.badge }}</span>
    </div>
    <div class="body">
      <h3>{{ item.title }}</h3>
      <p>{{ item.blurb }}</p>
      <ul class="tags">
        <li v-for="t in item.tags" :key="t">{{ t }}</li>
      </ul>
    </div>
  </a>
</template>
