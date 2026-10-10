<script setup lang="ts">
type Item = {
  title: string
  href: string
  blurb: string
  tags: string[]
  img?: string
  video?: string
  poster?: string
  fit?: 'cover' | 'contain'
  badge?: string
}
type Group = { id: string; title: string; note?: string; items: Item[] }

const groups: Group[] = [
  {
    id: 'unreal-engine',
    title: 'Unreal Engine',
    items: [
      {
        title: 'Building an Unreal Engine 5 FPS in 5 Days',
        href: '/projects/building-an-unreal-engine-5-fps-in-5-days',
        blurb: 'A first-person shooter built from scratch in five days.',
        tags: ['Unreal Engine 5', 'Blueprint'],
        img: '/projects/fps-5-days-1.png',
      },
    ],
  },
  {
    id: 'unreal-tutorials',
    title: 'Unreal Engine tutorials',
    items: [
      {
        title: 'Game Loop & UI Redesign',
        href: '/projects/game-loop-ui-redesign',
        blurb: 'A three-wave level structure with a reworked UI.',
        tags: ['Unreal Engine 5', 'C++'],
        video: '/projects/game-loop-ui-redesign-1.mp4',
        poster: '/projects/game-loop-ui-redesign-1-poster.jpg',
      },
      {
        title: 'Pawn Class 3D Character',
        href: '/projects/pawn-class-3d-character',
        blurb: 'A custom Pawn class driven by the Enhanced Input system.',
        tags: ['Unreal Engine 5', 'C++'],
        video: '/projects/pawn-class-3d-character-1.mp4',
        poster: '/projects/pawn-class-3d-character-1-poster.jpg',
      },
      {
        title: 'Rotation, Movement, Randomization, Spawning',
        href: '/projects/rotation-movement-randomization-spawning',
        blurb: 'Rotating and moving platforms driven by Tick, plus random spawning.',
        tags: ['Unreal Engine 5', 'C++'],
      },
    ],
  },
  {
    id: 'cpp',
    title: 'C++',
    items: [
      {
        title: 'TEAM8-Text-Console-RPG',
        href: '/projects/team8-text-console-rpg',
        blurb: 'A team-built, text-based console RPG with auto-battles and a split-screen layout.',
        tags: ['C++', 'Team project'],
        img: '/projects/team8-text-console-rpg-1.jpg',
      },
    ],
  },
  {
    id: 'unity',
    title: 'Unity',
    items: [
      {
        title: 'Rock Paper Scissors - Advance',
        href: '/projects/rock-paper-scissors-advance',
        blurb: 'Released on Google Play, playable in the browser.',
        tags: ['Unity', 'Google Play'],
        img: '/projects/rock-paper-scissors-advance-icon.png',
        fit: 'contain',
        badge: 'Released',
      },
      {
        title: 'Press Plane',
        href: '/projects/press-plane',
        blurb: 'Released on Google Play, playable in the browser.',
        tags: ['Unity', 'Google Play'],
        img: '/projects/press-plane-1.png',
        badge: 'Released',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools (AI-assisted)',
    note: 'Small utilities I planned and built with Claude. I wrote the plan and requirements, then tested and revised each one until it worked the way I wanted.',
    items: [
      {
        title: 'iCUE Scheduler',
        href: '/projects/icue-scheduler',
        blurb: 'Switches Corsair iCUE profiles and keyboard brightness by time of day.',
        tags: ['Windows', 'PowerShell', 'WPF'],
        img: '/projects/icue-scheduler-home.png',
      },
      {
        title: 'Brightness Scheduler',
        href: '/projects/brightness-scheduler',
        blurb: 'Schedules brightness and contrast for laptop screens and external monitors.',
        tags: ['Windows', 'C#', '.NET 10'],
        img: '/projects/brightness-scheduler-dashboard.png',
      },
      {
        title: 'NewsBriefing',
        href: '/projects/news-briefing',
        blurb: 'A market briefing written and committed every morning at 07:30 KST.',
        tags: ['Claude routine', 'Slack', 'Markdown'],
      },
    ],
  },
]

function initials(title: string) {
  return title
    .replace(/[^A-Za-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0].toUpperCase())
    .join('')
}

function play(e: Event) {
  const v = (e.currentTarget as HTMLElement).querySelector('video')
  v?.play().catch(() => {})
}
function stop(e: Event) {
  const v = (e.currentTarget as HTMLElement).querySelector('video')
  if (v) {
    v.pause()
    v.currentTime = 0
  }
}
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
        <a
          v-for="it in g.items"
          :key="it.href"
          :href="it.href"
          class="project-card"
          @mouseenter="play"
          @mouseleave="stop"
          @focus="play"
          @blur="stop"
        >
          <div class="thumb" :class="{ contain: it.fit === 'contain' }">
            <img v-if="it.img" :src="it.img" :alt="`${it.title} screenshot`" loading="lazy" />
            <video v-else-if="it.video" :src="it.video" :poster="it.poster" muted loop playsinline preload="none"></video>
            <div v-else class="thumb-fallback">{{ initials(it.title) }}</div>
            <span v-if="it.badge" class="badge">{{ it.badge }}</span>
          </div>
          <div class="body">
            <h3>{{ it.title }}</h3>
            <p>{{ it.blurb }}</p>
            <ul class="tags">
              <li v-for="t in it.tags" :key="t">{{ t }}</li>
            </ul>
          </div>
        </a>
      </div>
    </section>

    <p class="pg-contact">Questions about any of these are welcome on the <a href="/contact">Contact</a> page.</p>
  </div>
</template>
