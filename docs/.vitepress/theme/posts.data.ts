import { existsSync, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'

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
  // Optional `tags: [A, B]` and `image: /path.jpg` frontmatter, used by the DevLog card list.
  tags: string[]
  image: string
  // `/blog/x-dark.jpg` next to the image, when that file exists in docs/public.
  imageDark: string
}

export type ProjectGroup = { name: string; link: string; description: string; posts: Post[] }

export type BlogData = {
  posts: Post[]
  projects: ProjectGroup[]
  total: number
  latest: Post | null
}

const blogDir = new URL('../../blog/', import.meta.url)
const publicDir = new URL('../../public/', import.meta.url)
const darkOf = (img: string) => {
  const d = img.replace(/(\.[a-z]+)$/i, '-dark$1')
  return img && existsSync(fileURLToPath(new URL(d.replace(/^\//, ''), publicDir))) ? d : ''
}

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

// `tags: [UE5, C++]` -> ['UE5', 'C++']
const list = (v: string) =>
  v.replace(/^\[|\]$/g, '').split(',').map((t) => t.trim().replace(/^(["'])(.*)\1$/, '$2')).filter(Boolean)

const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

// blog/index.md is the source of truth: `## Project` headings, an optional one-line description,
// then posts newest-first as `- YYYY-MM-DD: [Title](./slug)`. The list sits in an HTML comment
// there, so it is read here but the page itself shows the BlogIndex cards.
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
        current = { name: h[1], link: existsSync(new URL(`${slug}.md`, blogDir)) ? `/blog/${slug}` : '/blog/', description: '', posts: [] }
        projects.push(current)
        continue
      }
      const p = line.match(/^- (\d{4}-\d{2}-\d{2}): \[(.+?)\]\(\.\/(.+?)\)/)
      if (!p && current && !current.description && !current.posts.length && line.trim() && !/^(<!--|-->)/.test(line.trim())) {
        current.description = line.trim()
        continue
      }
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
        tags: list(frontmatter(slug, 'tags')),
        image: frontmatter(slug, 'image'),
        imageDark: darkOf(frontmatter(slug, 'image')),
      })
    }

    const posts = projects.flatMap((g) => g.posts).sort((a, b) => b.date.localeCompare(a.date))
    return { posts, projects, total: posts.length, latest: posts[0] ?? null }
  },
}
