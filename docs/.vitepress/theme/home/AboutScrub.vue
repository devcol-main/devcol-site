<script setup lang="ts">
import Arrow from './Arrow.vue'

// Split into words in the template, so the server-rendered HTML already has the full sentence.
const words = "I'd rather show the work while it's happening than wait for a launch trailer. The DevLog has progress notes and debugging write-ups, including the mistakes.".split(/\s+/)
</script>

<template>
  <section class="section tight-top zone-about" aria-labelledby="about-label">
    <div class="wrap about-grid">
      <p id="about-label" class="sec-label">About</p>
      <div>
        <p class="scrub"><template v-for="(w, i) in words" :key="i"><span class="wd">{{ w }}</span>{{ ' ' }}</template></p>
        <div class="about-foot rv">
          <a class="arrow-link" href="/about">More about DevCol <Arrow kind="right" /></a>
          <a class="arrow-link" href="/faq">FAQ <Arrow kind="right" /></a>
        </div>
      </div>
    </div>
  </section>
</template>
