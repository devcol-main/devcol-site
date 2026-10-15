<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { data as blog } from '../posts.data'
import { data as notes } from '../study.data'
import { groups } from '../projects'
import { footage, heroPhrases, nowBuilding, nowBuildingTags } from '../site'
import AboutScrub from './AboutScrub.vue'
import ContactCta from './ContactCta.vue'
import FeatureCards from './FeatureCards.vue'
import FeaturedSlider from './FeaturedSlider.vue'
import FollowBand from './FollowBand.vue'
import FootageSlot from './FootageSlot.vue'
import HeroSection from './HeroSection.vue'
import LatestDevlog from './LatestDevlog.vue'
import Marquee from './Marquee.vue'
import ProjectStack from './ProjectStack.vue'
import ReelSection from './ReelSection.vue'
import TumbleTeamsTrack from './TumbleTeamsTrack.vue'
import { prefersReducedMotion } from './gsap'
import { initHomeMotion } from './motion'

// "Now building" comes from site.ts and must match a `## Heading` in docs/blog/index.md.
const current = blog.projects.find((p) => p.name === nowBuilding) ?? blog.projects[0]
const project = current?.name ?? nowBuilding
const projectLink = current?.link ?? '/blog/'
const projectPosts = current?.posts ?? []

const phrases = [...heroPhrases, ...(blog.latest ? [`Latest DevLog · ${blog.latest.date}`] : [])]
const projectCount = groups.reduce((n, g) => n + g.items.length, 0)
const kind = (nowBuildingTags[nowBuildingTags.length - 1] ?? '').toLowerCase()
const devlogBlurb = `Progress notes and debugging write-ups from the ${project}${kind ? ` ${kind}` : ''} project.`

// "Aug–Oct 2026" from the oldest and newest post of the current project
const month = (d: string, opts: Intl.DateTimeFormatOptions) => new Date(`${d}T00:00:00Z`).toLocaleDateString('en-US', { ...opts, timeZone: 'UTC' })
function range(posts: { date: string }[]) {
  if (!posts.length) return ''
  const a = posts[posts.length - 1].date
  const b = posts[0].date
  const [ya, yb] = [a.slice(0, 4), b.slice(0, 4)]
  if (a.slice(0, 7) === b.slice(0, 7)) return `${month(b, { month: 'short' })} ${yb}`
  if (ya === yb) return `${month(a, { month: 'short' })}–${month(b, { month: 'short' })} ${yb}`
  return `${month(a, { month: 'short' })} ${ya}–${month(b, { month: 'short' })} ${yb}`
}

const root = ref<HTMLElement>()
const pending = ref(true)
let stop: (() => void) | undefined
let alive = true

onMounted(async () => {
  if (prefersReducedMotion() || !root.value) {
    pending.value = false
    return
  }
  try {
    const cleanup = await initHomeMotion(root.value)
    if (alive) stop = cleanup
    else cleanup()
  } catch (e) {
    console.warn('Home animations unavailable', e)
  }
  pending.value = false
})
onBeforeUnmount(() => {
  alive = false
  stop?.()
})
</script>

<template>
  <div ref="root" class="dc-home" :class="{ 'is-pending': pending }">
    <HeroSection :phrases="phrases" :project="project" :project-link="projectLink" :latest="blog.latest" />
    <!-- Hidden until real footage is set in site.ts (footage.src). -->
    <FootageSlot v-if="footage.src" :project="project" :tags="nowBuildingTags" />
    <Marquee />
    <FeatureCards :projects="projectCount" :posts="blog.total" :notes="notes.length" :devlog-blurb="devlogBlurb" />
    <AboutScrub />
    <ReelSection />
    <ProjectStack />
    <FeaturedSlider />
    <TumbleTeamsTrack :project="project" :tags="nowBuildingTags" :posts="projectPosts" :range="range(projectPosts)" />
    <LatestDevlog :posts="blog.posts.slice(0, 5)" :notes="notes" />
    <FollowBand :project="project" />
    <ContactCta />
  </div>
</template>
