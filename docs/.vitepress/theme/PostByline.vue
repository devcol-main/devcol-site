<script setup lang="ts">
// Byline under the title on DevLog posts and Study notes: author (linked to /about), published date, last update.
import { computed } from 'vue'
import { useData, withBase } from 'vitepress'
import { author } from './site'

const { frontmatter, page } = useData()

const section = computed(() => page.value.relativePath.split('/')[0])
const show = computed(() => {
  const rel = page.value.relativePath
  if (!(section.value === 'blog' || section.value === 'study')) return false
  if (rel.endsWith('index.md') || frontmatter.value.layout) return false
  if (section.value === 'blog' && !frontmatter.value.date) return false // project overview pages
  return true
})

const fmt = (d: string | number | Date) =>
  new Date(d).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric', timeZone: 'UTC' })

// gray-matter turns an unquoted `date: 2026-10-13` into a Date; normalize to YYYY-MM-DD.
const isoDate = computed(() => {
  const d = frontmatter.value.date
  return d instanceof Date ? d.toISOString().slice(0, 10) : d ? String(d).slice(0, 10) : ''
})
const published = computed(() => (isoDate.value ? fmt(isoDate.value) : ''))
const updated = computed(() => {
  if (!page.value.lastUpdated) return ''
  const u = fmt(page.value.lastUpdated)
  return u === published.value ? '' : u
})
</script>

<template>
  <p v-if="show" class="post-byline">
    <span class="byline-avatar"><img :src="withBase('/logo.png')" alt="" width="22" height="22" /></span>
    <span>By <a :href="withBase(author.link)" rel="author">{{ author.name }}</a> <span class="byline-handle">({{ author.handle }})</span></span>
    <span v-if="published" class="byline-sep" aria-hidden="true">·</span>
    <time v-if="published" :datetime="isoDate">{{ published }}</time>
    <span v-if="updated" class="byline-sep" aria-hidden="true">·</span>
    <span v-if="updated" class="byline-updated">Updated {{ updated }}</span>
  </p>
</template>

<style scoped>
.post-byline {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 8px;
  margin: 0 0 20px;
  font-size: 0.84rem;
  line-height: 1.4;
  color: var(--vp-c-text-2);
}
.byline-avatar {
  display: inline-flex;
  width: 22px;
  height: 22px;
  border-radius: 50%;
  overflow: hidden;
  background: var(--vp-c-bg-soft);
}
.byline-avatar img { display: block; }
.post-byline a {
  color: var(--vp-c-text-1);
  font-weight: 600;
  text-decoration: none;
}
.post-byline a:hover { text-decoration: underline; }
.byline-handle, .byline-sep, .byline-updated { color: var(--vp-c-text-3); }
</style>
