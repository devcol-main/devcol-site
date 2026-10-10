<script setup lang="ts">
import type { Post } from '../posts.data'
import type { Note } from '../study.data'

defineProps<{ posts: Post[]; notes: Note[] }>()
</script>

<template>
  <section id="devlog" class="section tight-top zone-log" aria-labelledby="dl-title">
    <div class="wrap">
      <p class="sec-label">Writing</p>
      <h2 id="dl-title" class="h2 rv-title" style="margin-bottom: 40px">Latest from the DevLog</h2>
      <div class="log-bento">
        <div class="cell">
          <div class="cell-h"><h3>DevLog</h3><a class="hs-more" href="/blog/">All posts &rarr;</a></div>
          <ul class="hs-posts">
            <li v-for="p in posts" :key="p.link" class="rv">
              <a :href="p.link">
                <time :datetime="p.date">{{ p.date }}</time>
                <span class="hs-title">{{ p.title }}</span>
                <span v-if="p.description" class="hs-desc">{{ p.description }}</span>
              </a>
            </li>
          </ul>
        </div>
        <div class="cell">
          <div class="cell-h"><h3>Study notes</h3><a class="hs-more" href="/study/">All notes &rarr;</a></div>
          <ol class="study">
            <li v-for="n in notes" :key="n.link" class="rv"><a :href="n.link">{{ n.title }}</a></li>
          </ol>
        </div>
      </div>
    </div>
  </section>
</template>
