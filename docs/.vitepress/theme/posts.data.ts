import { readFileSync } from 'node:fs'

export type Post = { title: string; link: string; date: string; description: string }

const blogDir = new URL('../../blog/', import.meta.url)

function description(slug: string) {
  try {
    const src = readFileSync(new URL(`${slug}.md`, blogDir), 'utf-8')
    const m = src.match(/^description:\s*"?(.+?)"?\s*$/m)
    return m ? m[1] : ''
  } catch {
    return ''
  }
}

// blog/index.md lists posts newest-first, so its order is the source of truth.
export default {
  watch: ['../../blog/*.md'],
  load(): Post[] {
    const src = readFileSync(new URL('index.md', blogDir), 'utf-8')
    return [...src.matchAll(/^- (\d{4}-\d{2}-\d{2}): \[(.+?)\]\(\.\/(.+?)\)/gm)].map(([, date, title, slug]) => ({
      title,
      link: `/blog/${slug}`,
      date,
      description: description(slug),
    }))
  },
}
