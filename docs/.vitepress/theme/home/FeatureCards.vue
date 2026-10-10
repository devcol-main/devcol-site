<script setup lang="ts">
import Arrow from './Arrow.vue'
import { links } from '../site'

defineProps<{ projects: number; posts: number; notes: number; devlogBlurb: string }>()
</script>

<template>
  <section class="section tight-top zone-features" aria-label="Sections of the site">
    <div class="wrap">
      <div class="features">
        <a class="feature spot has-ticks rv" href="/projects/"><span class="ticks" aria-hidden="true"></span>
          <span class="f-top"><span class="f-ico"><svg class="i-grid" viewBox="0 0 24 24" aria-hidden="true"><rect class="q1" x="3.5" y="3.5" width="7" height="7" rx="1.5" /><rect class="q2" x="13.5" y="3.5" width="7" height="7" rx="1.5" /><rect class="q3" x="3.5" y="13.5" width="7" height="7" rx="1.5" /><rect class="q4" x="13.5" y="13.5" width="7" height="7" rx="1.5" /></svg></span><span class="f-count">{{ projects }} projects</span></span>
          <h3>Projects</h3>
          <p>Finished games and prototypes in Unreal Engine, C++, and Unity, some playable in the browser.</p>
          <span class="go" aria-hidden="true"><Arrow kind="diag" /></span>
        </a>
        <a class="feature spot has-ticks rv" href="/blog/"><span class="ticks" aria-hidden="true"></span>
          <span class="f-top"><span class="f-ico"><svg class="i-term" viewBox="0 0 24 24" aria-hidden="true"><rect x="2.75" y="4.25" width="18.5" height="15.5" rx="2.5" /><path class="chev" d="m7 9.5 3 2.5-3 2.5" /><path class="cur" d="M12.5 15h4.5" /></svg></span><span class="f-count">{{ posts }} posts</span></span>
          <h3>DevLog</h3>
          <p>{{ devlogBlurb }}</p>
          <span class="go" aria-hidden="true"><Arrow kind="diag" /></span>
        </a>
        <a class="feature spot has-ticks rv" href="/study/"><span class="ticks" aria-hidden="true"></span>
          <span class="f-top"><span class="f-ico"><svg class="i-book" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5" /><path class="page" d="M12 6.5c2-1.5 5-2 8.5-1.5v13c-3.5-.5-6.5 0-8.5 1.5z" /><path d="M12 6.5v13" /></svg></span><span class="f-count">{{ notes }} notes</span></span>
          <h3>Study</h3>
          <p>Short notes on Unreal Engine, C++, and Git that I wanted to keep.</p>
          <span class="go" aria-hidden="true"><Arrow kind="diag" /></span>
        </a>
        <a class="feature spot has-ticks rv" :href="links.discord"><span class="ticks" aria-hidden="true"></span>
          <span class="f-top"><span class="f-ico"><svg class="i-bubble" viewBox="0 0 24 24" aria-hidden="true"><g class="bub"><path d="M5 4.5h14a2 2 0 0 1 2 2v8.5a2 2 0 0 1-2 2h-7l-4.5 3.5V17H5a2 2 0 0 1-2-2V6.5a2 2 0 0 1 2-2z" /><path d="M8 10.75h.01M12 10.75h.01M16 10.75h.01" stroke-width="2" /></g></svg></span><span class="f-count">Discord</span></span>
          <h3>Community</h3>
          <p>Talk about the games or give feedback on Discord.</p>
          <span class="go" aria-hidden="true"><Arrow kind="diag" /></span>
        </a>
      </div>
    </div>
  </section>
</template>
