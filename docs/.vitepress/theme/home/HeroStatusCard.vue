<script setup lang="ts">
import type { Post } from '../posts.data'

defineProps<{ project: string; projectLink: string; latest: Post | null }>()
</script>

<template>
  <div class="status-card spot" role="group" aria-label="What DevCol is working on">
    <div class="sc-bar">
      <span class="sc-dot"></span><span class="sc-dot"></span><span class="sc-dot"></span>
      <span class="sc-title">devcol / status</span>
    </div>
    <ul class="sc-lines">
      <li style="--i: 0">
        <span class="k">now building</span>
        <span class="v sc-live"><span class="live-dot" aria-hidden="true"></span><a class="v" :href="projectLink">{{ project }}</a></span>
      </li>
      <li style="--i: 1"><span class="k">stack</span><a class="v" href="/study/">Unreal Engine 5 · C++ · Unity · C#</a></li>
      <li v-if="latest" style="--i: 2"><span class="k">latest DevLog</span><a class="v" :href="latest.link">{{ latest.title }}</a></li>
      <li style="--i: 3">
        <span class="k">on Google Play</span>
        <span class="v"><a class="v" href="/projects/press-plane">Press Plane</a>, <a class="v" href="/projects/rock-paper-scissors-advance">RPS Advance</a></span>
      </li>
      <li style="--i: 4"><span class="k">$</span><span><span class="sc-caret" aria-hidden="true"></span></span></li>
    </ul>
  </div>
</template>
