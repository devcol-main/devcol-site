import { defineConfig } from 'vitepress'
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { execFileSync } from 'node:child_process'
import { author, links } from './theme/site'

const SITE_URL = 'https://devcol.net'

type Post = [string, string]

const tumbleTeamsGroups: { text: string; posts: Post[] }[] = [
  {
    text: 'DevLogs',
    posts: [
      ['DevLog #1: ChatCore', '2026-08-11-tumble-teams-devlog-01-chatcore'],
      ['DevLog #2: Input and Pawn Init', '2026-10-03-tumble-teams-devlog-02-input-and-pawn-init'],
    ],
  },
  {
    text: 'Chat & Networking',
    posts: [
      ['Chat Focus Bugs', '2026-09-10-tumble-teams-chat-focus-bugs'],
      ["Host Couldn't Move", '2026-09-18-tumble-teams-listen-server-host-cant-move'],
      ['Chat Two-Player Testing', '2026-09-27-tumble-teams-chat-two-player-testing'],
    ],
  },
  {
    text: 'Character & GAS',
    posts: [
      ['Root Motion and BlendSpace', '2026-10-02-tumble-teams-root-motion-and-blendspace'],
      ['Stamina and Sprint', '2026-10-02-tumble-teams-gas-stamina-and-sprint'],
      ['Health and Head-Up UI', '2026-10-02-tumble-teams-gas-health-and-head-ui'],
      ['Damage and Hit Detection', '2026-10-03-tumble-teams-damage-and-hit-detection'],
      ['Mixamo Retargeting', '2026-10-03-tumble-teams-mixamo-retargeting'],
    ],
  },
]

const postExists = ([, slug]: Post) => existsSync(resolve('docs/blog', `${slug}.md`))
const postLink = ([text, slug]: Post) => ({ text, link: `/blog/${slug}` })

type SidebarItem = { text: string; link?: string; collapsed?: boolean; items?: SidebarItem[] }

const sidebar: Record<string, SidebarItem[]> = {
  '/projects/': [
    {
      text: 'Projects',
      items: [
        { text: 'All Projects', link: '/projects/' },
      ],
    },
    {
      text: 'Unreal Engine',
      items: [
        { text: 'LuckySeven: A Three-Stage UE5 Team Project', link: '/projects/luckyseven-ue5-team-project' },
        { text: 'Game Loop & UI Redesign', link: '/projects/game-loop-ui-redesign' },
        { text: 'Pawn Class 3D Character', link: '/projects/pawn-class-3d-character' },
        { text: 'Rotation, Movement, Randomization, Spawning', link: '/projects/rotation-movement-randomization-spawning' },
        { text: 'Building an Unreal Engine 5 FPS in 5 Days', link: '/projects/building-an-unreal-engine-5-fps-in-5-days' },
      ],
    },
    {
      text: 'C++',
      items: [
        { text: 'TEAM8-Text-Console-RPG', link: '/projects/team8-text-console-rpg' },
      ],
    },
    {
      text: 'Unity',
      items: [
        { text: 'Rock Paper Scissors - Advance', link: '/projects/rock-paper-scissors-advance' },
        { text: 'Press Plane', link: '/projects/press-plane' },
      ],
    },
    {
      text: 'Arcade Web',
      items: [
        { text: 'Overview', link: '/projects/arcade-web' },
        { text: 'Stack Up', link: '/projects/stack-up' },
        { text: 'Bug Squash', link: '/projects/bug-squash' },
      ],
    },
    {
      text: 'Tools (AI-Assisted)',
      items: [
        { text: 'devcol.net', link: '/projects/devcol-net' },
        { text: 'iCUE Scheduler', link: '/projects/icue-scheduler' },
        { text: 'Brightness Scheduler', link: '/projects/brightness-scheduler' },
        { text: 'NewsBriefing', link: '/projects/news-briefing' },
      ],
    },
  ],
  '/study/': [
    {
      text: 'Study',
      items: [
        { text: 'All Notes', link: '/study/' },
      ],
    },
    {
      text: 'Unreal Engine',
      items: [
        { text: 'Designing Item Classes Around an Interface', link: '/study/interface-based-item-class-design' },
        { text: 'Picking Up Items on Collision', link: '/study/collision-based-item-pickup' },
        { text: 'Item Spawning and Level Data Management', link: '/study/item-spawning-and-level-data-management' },
        { text: 'Character Health and Score Management', link: '/study/character-health-and-score-management' },
        { text: 'Controlling Game Flow with a Game Loop', link: '/study/game-loop-and-flow-control' },
        { text: 'ASC on the PlayerState', link: '/study/ability-system-component-on-the-player-state' },
        { text: 'Pawn Data and Input Tags', link: '/study/pawn-data-and-input-tags' },
        { text: 'CSV DataTables vs Data Assets', link: '/study/csv-datatables-vs-data-assets' },
        { text: 'Hard vs Soft References', link: '/study/hard-vs-soft-references-for-data-assets' },
      ],
    },
    {
      text: 'Git',
      items: [
        { text: 'Managing Unreal Engine Projects with Git LFS', link: '/study/git-lfs-for-unreal-engine-projects' },
        { text: 'Embedding GIFs and Images in a GitHub README', link: '/study/github-readme-gifs-and-images' },
      ],
    },
  ],
  '/wiki/': [
    {
      text: 'PSEUDO Wiki',
      items: [
        { text: 'Overview', link: '/wiki/' },
      ],
    },
    {
      text: 'Systems',
      items: [
        { text: 'All Systems', link: '/wiki/systems/' },
        { text: 'Dice', link: '/wiki/systems/dice' },
        { text: 'Combos and Cancels', link: '/wiki/systems/combo-and-cancels' },
        { text: 'Defense', link: '/wiki/systems/defense' },
        { text: 'Weapons', link: '/wiki/systems/weapons' },
        { text: 'Damage Formula', link: '/wiki/systems/damage-formula' },
        { text: 'Elements and Reactions', link: '/wiki/systems/elements' },
        { text: 'Stats and Level', link: '/wiki/systems/stats-and-level' },
        { text: 'Skill Tree', link: '/wiki/systems/skill-tree' },
      ],
    },
    {
      text: 'Lore',
      items: [
        { text: 'All Lore', link: '/wiki/lore/' },
        { text: 'World and Tone', link: '/wiki/lore/world-and-tone' },
        { text: 'Butterfly Signals', link: '/wiki/lore/butterfly-signals' },
      ],
    },
  ],
  '/blog/': [
    {
      text: 'DevLog',
      items: [
        { text: 'All Posts', link: '/blog/' },
        { text: 'Building devcol.net', link: '/blog/2026-09-17-building-devcol-net' },
        { text: 'Cookie-Free Analytics', link: '/blog/2026-10-23-devcol-analytics' },
      ],
    },
    {
      text: 'PSEUDO',
      items: [
        { text: 'Overview', link: '/blog/pseudo' },
        { text: 'Git Setup Before the First Push', link: '/blog/2026-10-11-pseudo-git-setup' },
        { text: 'Player Controller Tick Bug', link: '/blog/2026-10-13-pseudo-player-controller-tick-blocks-input' },
        {
          text: 'MetaHuman Face on Paragon',
          collapsed: false,
          items: [
          { text: 'Part 1: Setup Blockers', link: '/blog/2026-10-14-pseudo-metahuman-paragon-1-setup' },
          { text: 'Part 2: Face Attach', link: '/blog/2026-10-14-pseudo-metahuman-paragon-2-face-attach' },
          { text: 'Part 3: Headless Mesh', link: '/blog/2026-10-14-pseudo-metahuman-paragon-3-headless-mesh' },
          { text: 'Part 4: Grooms', link: '/blog/2026-10-15-pseudo-metahuman-paragon-4-grooms' },
          { text: 'Part 5: Cloth and Hair', link: '/blog/2026-10-15-pseudo-metahuman-paragon-5-cloth-and-hair' },
          ],
        },
        { text: 'Air Control 0.05', link: '/blog/2026-10-16-pseudo-air-control' },
        { text: 'Greatsword Grip and Hits', link: '/blog/2026-10-19-pseudo-greatsword-grip-and-hits' },
        { text: 'Predicted Weapon Swap', link: '/blog/2026-10-19-pseudo-predicted-weapon-swap' },
        { text: 'First Enemy: Camera and Facing', link: '/blog/2026-10-20-pseudo-first-enemy-camera-and-facing' },
        { text: 'Off-Screen Enemy Hits', link: '/blog/2026-10-20-pseudo-offscreen-enemy-hits' },
        { text: 'Guard Input Release', link: '/blog/2026-10-20-pseudo-guard-input-release' },
        { text: 'Hit Cue Never Plays', link: '/blog/2026-10-20-pseudo-hit-cue-never-plays' },
        { text: 'No Control After Menu Start', link: '/blog/2026-10-22-pseudo-menu-start-no-control' },
        { text: 'Menu Lumen Warning', link: '/blog/2026-10-22-pseudo-menu-lumen-exposure-warning' },
      ],
    },
    {
      text: 'Tumble Teams',
      items: [
        { text: 'Overview', link: '/blog/tumble-teams' },
        ...tumbleTeamsGroups
          .map((g) => ({ text: g.text, collapsed: false, items: g.posts.filter(postExists).map(postLink) }))
          .filter((g) => g.items.length > 0),
      ],
    },
    {
      text: 'Arcade Web',
      items: [
        { text: 'Overview', link: '/blog/arcade-web' },
        { text: 'Stack Up in Eight Steps', link: '/blog/2026-10-13-arcade-web-stack-up' },
        { text: 'Bug Squash Terminal Redesign', link: '/blog/2026-10-14-arcade-web-bug-squash-terminal-redesign' },
        { text: 'One Repository per Game', link: '/blog/2026-10-15-arcade-web-one-repo-per-game' },
      ],
    },
  ],
}

// Scheduled pages (scripts/schedule.mjs) are deleted before a CI build, so drop sidebar links to
// pages that don't exist and groups left empty.
const pageExists = (link: string) => {
  const r = link.replace(/^\//, '').replace(/#.*$/, '')
  return r === '' || r.endsWith('/') ? existsSync(resolve('docs', r, 'index.md')) : existsSync(resolve('docs', `${r}.md`))
}
const prune = (items: SidebarItem[] = []): SidebarItem[] =>
  items
    .filter((it) => !it.link || pageExists(it.link))
    .map((it) => (it.items ? { ...it, items: prune(it.items) } : it))
    .filter((it) => it.link || (it.items && it.items.length > 0))
for (const key of Object.keys(sidebar)) sidebar[key] = prune(sidebar[key])

// Prev/next links stay inside one top-level sidebar group (e.g. Arcade Web posts only link to other
// Arcade Web posts). Index pages ("All Posts") and group overviews are not part of the chain.
type PagerLink = { text: string; link: string }
const pager = new Map<string, { prev: PagerLink | false; next: PagerLink | false }>()
const inChain = (it: SidebarItem) => !!it.link && !it.link.endsWith('/') && it.text !== 'Overview'
const flatten = (items: SidebarItem[] = []): SidebarItem[] => items.flatMap((it) => [...(it.link ? [it] : []), ...flatten(it.items)])
for (const groups of Object.values(sidebar)) {
  for (const group of groups) {
    const all = flatten(group.items)
    const chain = all.filter(inChain) as PagerLink[]
    for (const it of all) if (!inChain(it)) pager.set(it.link!.replace(/^\//, ''), { prev: false, next: false })
    chain.forEach((it, i) => {
      const prev = chain[i - 1], next = chain[i + 1]
      pager.set(it.link.replace(/^\//, ''), {
        prev: prev ? { text: prev.text, link: prev.link } : false,
        next: next ? { text: next.text, link: next.link } : false,
      })
    })
  }
}

export default defineConfig({
  title: 'DevCol',
  description: 'DevCol — development collaboration. Building an indie game with the players, in the open.',
  cleanUrls: true,
  // Internal docs kept next to the pages they describe, not published.
  srcExclude: ['GAME-ANALYTICS.md'],
  // High-contrast Shiki themes keep code tokens at AA contrast on the site's code background.
  markdown: { theme: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' } },
  lastUpdated: true,

  transformPageData(pageData) {
    const route = pageData.relativePath.replace(/\.md$/, '').replace(/(^|\/)index$/, '$1')
    const fm = pageData.frontmatter
    const head: [string, Record<string, string>, string?][] = []

    // `noindex: true` keeps thin utility pages (contact, stats) out of search without hiding them from visitors.
    if (fm.noindex) head.push(['meta', { name: 'robots', content: 'noindex, follow' }])

    // Articles (DevLog, Study) get schema.org author/date metadata pointing at /about.
    const section = route.split('/')[0]
    if ((section === 'blog' || section === 'study') && !route.endsWith('/') && route !== section && !fm.layout) {
      const isPost = !!fm.date
      // gray-matter parses an unquoted `date: 2026-10-13` into a Date; keep the YYYY-MM-DD form.
      const published = fm.date instanceof Date ? fm.date.toISOString().slice(0, 10) : fm.date ? String(fm.date).slice(0, 10) : ''
      const ld = {
        '@context': 'https://schema.org',
        '@type': isPost ? 'BlogPosting' : 'TechArticle',
        headline: fm.title ?? pageData.title,
        description: fm.description ?? '',
        url: `${SITE_URL}/${route}`,
        ...(published ? { datePublished: published } : {}),
        ...(pageData.lastUpdated ? { dateModified: new Date(pageData.lastUpdated).toISOString().slice(0, 10) } : {}),
        ...(fm.image ? { image: `${SITE_URL}${fm.image}` } : {}),
        author: { '@type': 'Person', name: author.name, alternateName: author.handle, url: `${SITE_URL}${author.link}` },
        publisher: { '@type': 'Organization', name: 'DevCol', url: SITE_URL, logo: { '@type': 'ImageObject', url: `${SITE_URL}/logo.png` } },
      }
      head.push(['script', { type: 'application/ld+json' }, JSON.stringify(ld)])
    }
    if (head.length) fm.head = [...(fm.head ?? []), ...head]

    const p = pager.get(route)
    if (!p) return
    // An explicit `prev:` / `next:` in a page's frontmatter still wins.
    fm.prev ??= p.prev
    fm.next ??= p.next
  },

  head: [
    ['script', {}, "document.documentElement.classList.add('js')"],
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    // DevCol analytics (no cookies). Source and minify step: devcol-main/devcol-analytics
    ['script', { defer: '', src: '/t.js' }],
    ['meta', { name: 'naver-site-verification', content: 'a02a938ce2ba6e8e795a9b8a405bacae34a4e997' }],
    ['script', {
      async: '',
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4892249986723209',
      crossorigin: 'anonymous',
    }],
  ],

  async buildEnd(siteConfig) {
    // sitemap.xml with <lastmod>: the page's last git commit date (CI checks out full history), else the
    // frontmatter `date`, else the file's mtime. Pages marked `noindex: true` are left out.
    const frontmatterOf = (file: string) => readFileSync(file, 'utf-8').match(/^---\r?\n([\s\S]*?)\r?\n---/)?.[1] ?? ''
    const gitDate = (file: string) => {
      try {
        return execFileSync('git', ['log', '-1', '--format=%cI', '--', file], { cwd: siteConfig.srcDir, stdio: ['ignore', 'pipe', 'ignore'] }).toString().trim()
      } catch {
        return ''
      }
    }
    const entries = siteConfig.pages.flatMap((page) => {
      const file = resolve(siteConfig.srcDir, page)
      const fm = frontmatterOf(file)
      if (/^noindex:\s*true/m.test(fm)) return []
      let route = page.replace(/\.md$/, '')
      route = route === 'index' ? '' : route.endsWith('/index') ? route.slice(0, -'index'.length) : route
      const iso = gitDate(file) || fm.match(/^date:\s*["']?(\d{4}-\d{2}-\d{2})/m)?.[1] || statSync(file).mtime.toISOString()
      return [{ loc: `${SITE_URL}/${route}`, lastmod: iso.slice(0, 10) }]
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${entries
      .map((e) => `  <url><loc>${e.loc}</loc><lastmod>${e.lastmod}</lastmod></url>`)
      .join('\n')}\n</urlset>\n`

    writeFileSync(resolve(siteConfig.outDir, 'sitemap.xml'), xml, 'utf-8')
  },

  themeConfig: {
    logo: { src: '/logo.png', alt: 'DevCol logo' },
    nav: ([
      { text: 'Projects', link: '/projects/' },
      { text: 'DevLog', link: '/blog/' },
      { text: 'Study', link: '/study/' },
      { text: 'Wiki', link: '/wiki/' },
      {
        text: 'More',
        items: [
          { text: 'About', link: '/about' },
          { text: 'FAQ', link: '/faq' },
          { text: 'Contact', link: '/contact' },
          { text: 'Site Stats', link: '/stats' },
          { text: 'Privacy Policy', link: '/privacy-policy' },
        ],
      },
    ] as { text: string; link?: string; items?: { text: string; link: string }[] }[]).filter((it) => !it.link || pageExists(it.link)),

    sidebar,
    socialLinks: [
      { icon: { svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>YouTube</title><rect x="2.5" y="5.5" width="19" height="13" rx="4" fill="none" stroke="currentColor" stroke-width="1.5"/><path d="M10 9.2v5.6l4.8-2.8z" fill="currentColor"/></svg>' }, link: links.youtube, ariaLabel: 'YouTube' },
      { icon: { svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>itch.io</title><path d="M4 4h16l1.5 4.5c0 1.4-1.1 2.5-2.4 2.5S16.7 9.9 16.7 8.5c0 1.4-1.1 2.5-2.4 2.5S12 9.9 12 8.5c0 1.4-1.1 2.5-2.4 2.5S7.3 9.9 7.3 8.5c0 1.4-1.1 2.5-2.4 2.5S2.5 9.9 2.5 8.5z" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/><path d="M4 11v7.5h16V11M10 18.5v-4h4v4" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linejoin="round"/></svg>' }, link: links.itch, ariaLabel: 'itch.io' },
      { icon: 'github', link: links.github },
      { icon: { svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Discord</title><path d="M8.5 5.5c-1.8.3-3.3.9-4.5 1.7C2.3 10 1.8 13.2 2.1 16.4c1.5 1.2 3.2 2 4.9 2.4l1-1.8M15.5 5.5c1.8.3 3.3.9 4.5 1.7 1.7 2.8 2.2 6 1.9 9.2-1.5 1.2-3.2 2-4.9 2.4l-1-1.8M7 16.2c3.2 1.4 6.8 1.4 10 0M7.5 7.6c2.9-1 6.1-1 9 0" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/><circle cx="9" cy="12.3" r="1.4" fill="currentColor"/><circle cx="15" cy="12.3" r="1.4" fill="currentColor"/></svg>' }, link: links.discord, ariaLabel: 'Discord' },
      { icon: 'x', link: links.x },
    ],

    search: {
      provider: 'local',
    },

    // The site footer is the SiteFooter component (theme/SiteFooter.vue, layout-bottom slot) on every page.
  },
})
