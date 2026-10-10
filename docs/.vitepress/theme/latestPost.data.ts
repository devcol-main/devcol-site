import { readFileSync } from 'node:fs'

// The first post link in blog/index.md is the newest one (the list is kept newest-first).
export default {
  watch: ['../../blog/index.md'],
  load() {
    const src = readFileSync(new URL('../../blog/index.md', import.meta.url), 'utf-8')
    const m = src.match(/^- \d{4}-\d{2}-\d{2}: \[(.+?)\]\((.+?)\)/m)
    if (!m) return { title: 'DevLog', link: '/blog/' }
    const slug = m[2].replace(/^\.\//, '')
    return { title: m[1], link: `/blog/${slug}` }
  },
}
