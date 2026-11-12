<script setup lang="ts">
import ProjectCard from './ProjectCard.vue'
import { games } from './arcade'
</script>

<template>
  <div class="projects-page arcade-page">
    <header class="projects-hero">
      <p class="eyebrow">Arcade</p>
      <h1>Short games you can play right here.</h1>
      <p class="lede">
        No install, no account. Each game runs in the browser on a phone or a desktop and takes a minute or two a run. Pick one and play.
      </p>
    </header>

    <section class="pg-group">
      <div class="pg-cards">
        <ProjectCard v-for="g in games" :key="g.href" :item="g" />
      </div>
    </section>

    <p class="pg-contact">
      Found a bug or have an idea for the next game? Tell me on the <a href="/contact">Contact</a> page.
      How these games are built is on the <a href="/projects/arcade-web">Arcade Web</a> project page.
    </p>
  </div>
</template>
