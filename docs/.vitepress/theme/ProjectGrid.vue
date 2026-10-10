<script setup lang="ts">
import ProjectCard from './ProjectCard.vue'
import { groups } from './projects'
</script>

<template>
  <div class="projects-page">
    <header class="projects-hero">
      <p class="eyebrow">Projects</p>
      <h1>Games, prototypes, and the tools I built along the way.</h1>
      <p class="lede">
        Built in Unreal Engine, C++, and Unity, plus a few small tools I use myself. Newest first within each group.
      </p>
    </header>

    <section v-for="g in groups" :key="g.id" class="pg-group">
      <header class="pg-head">
        <h2 :id="g.id">{{ g.title }}</h2>
        <p v-if="g.note">{{ g.note }}</p>
      </header>
      <div class="pg-cards">
        <ProjectCard v-for="it in g.items" :key="it.href" :item="it" />
      </div>
    </section>

    <p class="pg-contact">Questions about any of these are welcome on the <a href="/contact">Contact</a> page.</p>
  </div>
</template>
