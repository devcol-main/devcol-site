<script setup lang="ts">
import { links } from '../site'
import Arrow from './Arrow.vue'

defineProps<{ project: string }>()

const channels = [
  { label: 'YouTube', handle: '@devcol', href: links.youtube },
  { label: 'X', handle: '@DevCol_Main', href: links.x },
  { label: 'itch.io', handle: 'devcol', href: links.itch },
  { label: 'GitHub', handle: 'devcol-main', href: links.github },
]
</script>

<template>
  <section class="band-a" aria-labelledby="community-title">
    <div class="wrap">
      <div class="rv">
        <h2 id="community-title">Follow us<em>.</em></h2>
        <p>Questions about a DevLog post, bugs you spot, or ideas for {{ project }}. Discord is where I read them.</p>
        <div class="actions">
          <a class="btn" :href="links.discord">Join the Discord<span class="ico" aria-hidden="true"><Arrow kind="right" :width="1.6" /></span></a>
        </div>
      </div>
      <ul class="channels rv" aria-label="Other channels">
        <li v-for="c in channels" :key="c.label">
          <a :href="c.href"><span class="lbl">{{ c.label }}</span> <span class="mono">{{ c.handle }} <Arrow kind="diag" /></span></a>
        </li>
      </ul>
    </div>
  </section>
</template>
