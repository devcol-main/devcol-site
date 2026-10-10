<script setup lang="ts">
import type { Item } from './projects'

defineProps<{ item: Item }>()

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
  <a :href="item.href" class="project-card">
    <div class="thumb" :class="{ contain: item.fit === 'contain' }">
      <img v-if="item.img" :src="item.img" :alt="`${item.title} screenshot`" loading="lazy" />
      <video
        v-else-if="item.video"
        :src="item.video"
        :poster="item.poster"
        autoplay
        muted
        loop
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
