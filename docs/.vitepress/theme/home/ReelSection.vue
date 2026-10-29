<script setup lang="ts">
import LogoMark from '../LogoMark.vue'

// "Show the work [logo] while it's happening." The logo in the pill assembles as the section scrolls into the
// middle of the screen (home/motion.ts drives it). Words ink in with the same scroll.
const before = ['Show', 'the', 'work']
const after = ['while', "it's", 'happening.']
</script>

<template>
  <section id="reel" class="reel gridded" data-bg="paper-3" aria-labelledby="reel-title">
    <div class="wrap reel-inner">
      <h2 id="reel-title" class="reel-title">
        <template v-for="(w, i) in before" :key="`b${i}`"><span class="wd">{{ w }}</span>{{ ' ' }}</template><span class="inline-media wd" aria-hidden="true"><LogoMark id="reel" mode="scrub" /></span>{{ ' ' }}<template v-for="(w, i) in after" :key="`a${i}`"><span class="wd">{{ w }}</span>{{ i < after.length - 1 ? ' ' : '' }}</template>
      </h2>
      <p class="reel-sub mono">DevLogs, including the mistakes.</p>
    </div>
  </section>
</template>
