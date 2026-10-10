<script setup lang="ts">
import { data as latest } from './latestPost.data'
</script>

<template>
  <div class="status-card" role="group" aria-label="What DevCol is working on">
    <div class="sc-bar">
      <span class="sc-dot"></span><span class="sc-dot"></span><span class="sc-dot"></span>
      <span class="sc-title">devcol / status</span>
    </div>
    <ul class="sc-lines">
      <li style="--i: 0"><span class="k">now building</span><a class="v" href="/blog/tumble-teams">Tumble Teams</a></li>
      <li style="--i: 1"><span class="k">stack</span><a class="v" href="/study/">Unreal Engine 5 · C++ · Unity · C# · AI</a></li>
      <li style="--i: 2">
        <span class="k">latest DevLog</span>
        <a class="v" :href="latest.link">{{ latest.title }}</a>
      </li>
      <li style="--i: 3">
        <span class="k">on Google Play</span>
        <span class="v">
          <a class="v" href="/projects/press-plane">Press Plane</a>,
          <a class="v" href="/projects/rock-paper-scissors-advance">RPS Advance</a>
        </span>
      </li>
      <li style="--i: 4" class="sc-prompt"><span class="k">$</span><span class="sc-caret"></span></li>
    </ul>
  </div>
</template>
