import { readdirSync, readFileSync } from 'node:fs'

export type Note = { title: string; link: string }

const studyDir = new URL('../../study/', import.meta.url)

function titleOf(slug: string) {
  const src = readFileSync(new URL(`${slug}.md`, studyDir), 'utf-8')
  return src.match(/^title:\s*"?(.+?)"?\s*$/m)?.[1] ?? slug
}

// Every study/*.md except index.md is a note. Order follows the links in study/index.md.
export default {
  watch: ['../../study/*.md'],
  load(): Note[] {
    const slugs = readdirSync(studyDir)
      .filter((f) => f.endsWith('.md') && f !== 'index.md')
      .map((f) => f.slice(0, -3))
    const index = readFileSync(new URL('index.md', studyDir), 'utf-8')
    const order = [...index.matchAll(/\]\(\/study\/([^)\s]+)\)/g)].map((m) => m[1])
    const sorted = [...slugs].sort((a, b) => {
      const ia = order.indexOf(a), ib = order.indexOf(b)
      return (ia < 0 ? 999 : ia) - (ib < 0 ? 999 : ib)
    })
    return sorted.map((slug) => {
      const h1 = readFileSync(new URL(`${slug}.md`, studyDir), 'utf-8').match(/^# (.+)$/m)?.[1]
      return { title: h1 ?? titleOf(slug), link: `/study/${slug}` }
    })
  },
}
