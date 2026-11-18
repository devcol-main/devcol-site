<script setup lang="ts">
import { computed } from 'vue'

// A web game in a portrait frame. Either a self-hosted build from docs/public/games/<slug>/ (`slug`), or a
// build hosted elsewhere, such as an itch.io embed (`src`, with `href` for the full-screen link).
// The margins keep ads that auto ads might place above or below away from the play area.
const props = withDefaults(defineProps<{ slug?: string; src?: string; href?: string; title: string; hint?: string; ratio?: string }>(), {
  ratio: '9 / 16',
})
const frameSrc = computed(() => props.src ?? `/games/${props.slug}/index.html`)
const fullHref = computed(() => props.href ?? frameSrc.value)
</script>

<template>
  <figure class="game-frame">
    <div class="game-frame-box" :style="{ aspectRatio: ratio }">
      <iframe :src="frameSrc" :title="title" loading="lazy" allowfullscreen></iframe>
    </div>
    <figcaption>
      <span v-if="hint">{{ hint }}</span>
      <a :href="fullHref" target="_blank" rel="noopener">Open full screen ↗</a>
    </figcaption>
  </figure>
</template>
