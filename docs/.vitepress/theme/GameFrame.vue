<script setup lang="ts">
// A self-hosted web game from docs/public/games/<slug>/, shown in a 9:16 frame.
// The margins keep ads that auto ads might place above or below away from the play area.
defineProps<{ slug: string; title: string; hint?: string }>()
</script>

<template>
  <figure class="game-frame">
    <div class="game-frame-box">
      <iframe :src="`/games/${slug}/index.html`" :title="title" loading="lazy"></iframe>
    </div>
    <figcaption>
      <span v-if="hint">{{ hint }}</span>
      <a :href="`/games/${slug}/index.html`" target="_blank" rel="noopener">Open full screen ↗</a>
    </figcaption>
  </figure>
</template>
