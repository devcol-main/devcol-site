import { existsSync, readFileSync } from 'node:fs'

export type Post = {
  title: string
  link: string
  date: string
  description: string
  project: string
  // Short label for the home page build track. Optional `track:` frontmatter, else a trimmed title.
  track: string
  // "DevLog #2" when the title says so.
  devlog: string
}

export type ProjectGroup = { name: string; link: string; posts: Post[] }

export type BlogData = {
  posts: Post[]
  projects: ProjectGroup[]
  total: number
  latest: Post | null
}

const blogDir = new URL('../../blog/', import.meta.url)

function frontmatter(slug: string, key: string) {
  try {
    const src = readFileSync(new URL(`${slug}.md`, blogDir), 'utf-8')
    const head = src.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    const m = head?.[1].match(new RegExp(`^${key}:\\s*(.+?)\\s*$`, 'm'))
    return m ? m[1].replace(/^(["'])(.*)\1$/, '$2') : ''
  } catch {
    return ''
  }
}

// "Why Only the Listen-Server Host Couldn't Move" -> cut at a word boundary
function trim(title: string, max = 38) {
  if (title.length <= max) return title
  const cut = title.slice(0, max).replace(/\s+\S*$/, '').replace(/[,:;\s]+$/, '')
  return `${cut}…`
}

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// blog/index.md is the source of truth: `## Project` headings, posts newest-first as
// `- YYYY-MM-DD: [Title](./slug)`.
export default {
  watch: ['../../blog/*.md'],
  load(): BlogData {
    const src = readFileSync(new URL('index.md', blogDir), 'utf-8')
    const projects: ProjectGroup[] = []
    let current: ProjectGroup | undefined

    for (const line of src.split(/\r?\n/)) {
      const h = line.match(/^##\s+(.+?)\s*$/)
      if (h) {
        const slug = slugify(h[1])
        current = { name: h[1], link: existsSync(new URL(`${slug}.md`, blogDir)) ? `/blog/${slug}` : '/blog/', posts: [] }
        projects.push(current)
        continue
      }
      const p = line.match(/^- (\d{4}-\d{2}-\d{2}): \[(.+?)\]\(\.\/(.+?)\)/)
      if (!p || !current) continue
      const [, date, title, slug] = p
      current.posts.push({
        title,
        link: `/blog/${slug}`,
        date,
        description: frontmatter(slug, 'description'),
        project: current.name,
        track: frontmatter(slug, 'track') || trim(title),
        devlog: title.match(/DevLog #\d+/)?.[0] ?? '',
      })
    }

    const posts = projects.flatMap((g) => g.posts).sort((a, b) => b.date.localeCompare(a.date))
    return { posts, projects, total: posts.length, latest: posts[0] ?? null }
  },
}
