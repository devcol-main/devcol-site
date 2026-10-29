<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { stack } from '../projects'
import Arrow from './Arrow.vue'
import { watchVideo } from './videos'

const root = ref<HTMLElement>()
let stops: (() => void)[] = []
onMounted(() => root.value?.querySelectorAll<HTMLVideoElement>('video').forEach((v) => stops.push(watchVideo(v))))
onBeforeUnmount(() => { stops.forEach((s) => s()); stops = [] })

const short = (tag: string) => tag.replace('Unreal Engine 5', 'UE5')
</script>

<template>
  <section id="work" class="section zone-work" data-bg="paper-2" aria-labelledby="work-title">
    <div class="wrap">
      <div class="sec-head">
        <div>
          <p class="sec-label">Selected work</p>
          <h2 id="work-title" class="h2 rv-title">Projects</h2>
          <p class="lede">Earlier builds, released games, and team projects.</p>
        </div>
        <a class="arrow-link" href="/projects/">All projects <Arrow kind="right" /></a>
      </div>

      <ol ref="root" class="stack">
        <li v-for="(p, i) in stack" :key="p.href" class="card" :style="{ '--i': i }">
          <article class="card-in spot">
            <a class="card-link" :href="p.href">
              <div class="frame" :class="{ contain: p.fit === 'contain' }">
                <div class="par">
                  <video
                    v-if="p.video"
                    :src="p.start ? `${p.video}#t=${p.start}` : p.video"
                    :poster="p.poster"
                    :data-start="p.start"
                    :loop="!p.start"
                    muted
                    playsinline
                    preload="metadata"
                    :aria-label="`${p.title} gameplay clip`"
                  ></video>
                  <img v-else-if="p.img" :src="p.img" :alt="`${p.title} screenshot`" loading="lazy" />
                </div>
                <span class="cm" aria-hidden="true"></span>
                <span v-if="p.badge || p.video" class="badge">
                  <svg v-if="!p.badge" viewBox="0 0 24 24" aria-hidden="true"><path d="M7 5v14l12-7z" fill="currentColor" /></svg>{{ p.badge ?? 'Clip' }}
                </span>
              </div>
              <div class="card-body">
                <div>
                  <ul class="tags"><li v-for="t in p.tags.slice(0, 2)" :key="t">{{ short(t) }}</li></ul>
                  <h3>{{ p.title }}</h3>
                  <p>{{ p.blurb }}</p>
                </div>
                <span class="card-go">{{ p.badge ? 'See the project' : 'Read the write-up' }} <Arrow kind="right" :width="1.6" /></span>
              </div>
            </a>
            <span class="shade" aria-hidden="true"></span>
          </article>
        </li>
      </ol>
    </div>
  </section>
</template>
