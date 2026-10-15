import { defineConfig } from 'vitepress'
import { existsSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { links } from './theme/site'

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

export default defineConfig({
  title: 'DevCol',
  description: 'DevCol — development collaboration. Building an indie game with the players, in the open.',
  cleanUrls: true,
  srcExclude: ['wiki/**'],
  // High-contrast Shiki themes keep code tokens at AA contrast on the site's code background.
  markdown: { theme: { light: 'github-light-high-contrast', dark: 'github-dark-high-contrast' } },
  lastUpdated: true,

  head: [
    ['script', {}, "document.documentElement.classList.add('js')"],
    ['link', { rel: 'icon', href: '/favicon.ico' }],
    ['meta', { name: 'naver-site-verification', content: 'a02a938ce2ba6e8e795a9b8a405bacae34a4e997' }],
    ['script', {
      async: '',
      src: 'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=ca-pub-4892249986723209',
      crossorigin: 'anonymous',
    }],
  ],

  async buildEnd(siteConfig) {
    const urls = siteConfig.pages.map((page) => {
      let route = page.replace(/\.md$/, '')
      route = route === 'index' ? '' : route.endsWith('/index') ? route.slice(0, -'index'.length) : route
      return `${SITE_URL}/${route}`
    })

    const xml = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls
      .map((url) => `  <url><loc>${url}</loc></url>`)
      .join('\n')}\n</urlset>\n`

    writeFileSync(resolve(siteConfig.outDir, 'sitemap.xml'), xml, 'utf-8')
  },

  themeConfig: {
    logo: { src: '/logo.png', alt: 'DevCol logo' },
    nav: [
      { text: 'Projects', link: '/projects/' },
      { text: 'DevLog', link: '/blog/' },
      { text: 'Study', link: '/study/' },
      {
        text: 'More',
        items: [
          { text: 'About', link: '/about' },
          { text: 'FAQ', link: '/faq' },
          { text: 'Contact', link: '/contact' },
          { text: 'Privacy Policy', link: '/privacy-policy' },
        ],
      },
    ],

    sidebar: {
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
      '/blog/': [
        {
          text: 'DevLog',
          items: [
            { text: 'All Posts', link: '/blog/' },
            { text: 'Building devcol.net', link: '/blog/2026-09-17-building-devcol-net' },
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
      ],
    },

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
