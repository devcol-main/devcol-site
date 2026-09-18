import { defineConfig } from 'vitepress'
import { writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const SITE_URL = 'https://devcol.net'

export default defineConfig({
  title: 'DevCol',
  description: 'DevCol — development collaboration. Building an indie game with the players, in the open.',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
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
    nav: [
      { text: 'Projects', link: '/projects/' },
      { text: 'DevLog', link: '/blog/' },
      { text: 'Study', link: '/study/' },
      { text: 'Wiki', link: '/wiki/' },
      {
        text: 'More',
        items: [
          { text: 'About', link: '/about' },
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
            { text: 'All projects', link: '/projects/' },
          ],
        },
        {
          text: 'Unreal Engine',
          items: [
            { text: 'Building an Unreal Engine 5 FPS in 5 Days', link: '/projects/building-an-unreal-engine-5-fps-in-5-days' },
            { text: 'Pawn Class 3D Character', link: '/projects/pawn-class-3d-character' },
            { text: 'Rotation, Movement, Randomization, Spawning', link: '/projects/rotation-movement-randomization-spawning' },
            { text: 'Game Loop & UI Redesign', link: '/projects/game-loop-ui-redesign' },
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
      ],
      '/study/': [
        {
          text: 'Study',
          items: [
            { text: 'All notes', link: '/study/' },
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
          text: 'Devlog',
          items: [
            { text: 'All posts', link: '/blog/' },
          ],
        },
      ],
      '/wiki/': [
        {
          text: 'Wiki',
          items: [
            { text: 'Overview', link: '/wiki/' },
            { text: 'FAQ', link: '/wiki/faq' },
          ],
        },
        {
          text: 'Lore',
          items: [
            { text: 'Overview', link: '/wiki/lore/' },
          ],
        },
        {
          text: 'Systems',
          items: [
            { text: 'Overview', link: '/wiki/systems/' },
          ],
        },
      ],
    },

    socialLinks: [
      { icon: 'youtube', link: 'https://www.youtube.com/@devcol' },
      { 
        icon: {
          svg: '<svg role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><title>Itch.io</title><path d="M2.384 0h19.232c1.32 0 2.384 1.064 2.384 2.384v19.232c0 1.32-1.064 2.384-2.384 2.384H2.384C1.064 23.4 0 22.336 0 21.016V2.384C0 1.064 1.064 0 2.384 0zm3.328 4.72a1.458 1.458 0 0 0-1.042.427 1.458 1.458 0 0 0-.427 1.042v1.365c0 .392.142.729.427 1.015.285.286.622.428 1.015.428h1.222V7.492H6.974v1.498H5.716a.434.434 0 0 1-.313-.125.434.434 0 0 1-.125-.313V7.037c0-.12.042-.222.125-.306.084-.084.186-.126.306-.126h1.258V4.72H5.712zm6.754 0v1.885h1.222c.12 0 .222.042.306.126.084.084.125.186.125.306v1.547a.434.434 0 0 1-.125.313.434.434 0 0 1-.306.125h-1.222v1.884h1.258c.392 0 .729-.142 1.015-.428.286-.286.428-.623.428-1.015V7.073c0-.392-.142-.73-.428-1.015-.286-.285-.623-.428-1.015-.428h-1.258zm-3.082.035a1.42 1.42 0 0 0-.965.378 1.25 1.25 0 0 0-.417.935v2.859c0 .12.042.222.125.306.084.084.186.126.306.126h1.365a1.29 1.29 0 0 0 .935-.417 1.42 1.42 0 0 0 .378-.965V6.068a1.36 1.36 0 0 0-.378-.935 1.29 1.29 0 0 0-.935-.378h-1.421zm.035.965h1.352v2.823c0 .036-.013.068-.039.094a.127.127 0 0 1-.094.039h-.335a.127.127 0 0 1-.094-.039.127.127 0 0 1-.039-.094V5.72h-.751v2.823c0 .036-.013.068-.039.094a.127.127 0 0 1-.094.039h-.335a.127.127 0 0 1-.094-.039.127.127 0 0 1-.039-.094V5.72h-.535V6.03c0 .191.071.356.213.498.142.142.307.213.498.213h.641zM2.87 14.004v1.884h1.222c.12 0 .222.042.306.126.084.084.126.186.126.306v1.547a.434.434 0 0 1-.126.313.434.434 0 0 1-.306.125H2.87v1.884h1.258c.392 0 .729-.142 1.015-.428.286-.286.428-.622.428-1.015v-3.414c0-.392-.142-.729-.428-1.015-.286-.286-.623-.428-1.015-.428H2.87zm6.754 0v5.344h1.258c.392 0 .729-.142 1.015-.428.286-.286.428-.622.428-1.015v-2.461c0-.392-.142-.729-.428-1.015-.286-.286-.623-.425-1.015-.425H9.624zm1.258.965h.641c.191 0 .356.071.498.213.142.142.213.307.213.498v2.461c0 .191-.071.356-.213.498-.142.142-.307.213-.498.213h-.641v-3.883zm4.512-.965a1.458 1.458 0 0 0-1.042.427 1.458 1.458 0 0 0-.427 1.042v3.414c0 .392.142.729.427 1.015.285.286.622.428 1.015.428h1.222v-.965H16.14a.434.434 0 0 1-.313-.125.434.434 0 0 1-.125-.313v-1.127h1.258v-.965H15.702v-1.07h1.294v-.965h-1.294v-.401h1.294v-.965h-1.222zm4.148 0v5.344h1.258c.392 0 .729-.142 1.015-.428.286-.286.428-.622.428-1.015v-2.461c0-.392-.142-.729-.428-1.015-.286-.286-.623-.425-1.015-.425h-1.258zm1.258.965h.641c.191 0 .356.071.498.213.142.142.213.307.213.498v2.461c0 .191-.071.356-.213.498-.142.142-.307.213-.498.213h-.641v-3.883z" fill="currentColor"/></svg>'
        },
        link: 'https://devcol.itch.io',
        ariaLabel: 'Itch.io'      
      },
      { icon: 'github', link: 'https://github.com/devcol-main' },
      { icon: 'discord', link: 'https://discord.gg/7YTgpP8CCt' },
      { icon: 'x', link: 'https://x.com/DevCol_Main' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Built in the open with DevCol.',
      copyright: 'Copyright © 2026-present DevCol (by in9)',
    },
  },
})
