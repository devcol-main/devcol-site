import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'devcol',
  description: 'devcol — development collaboration. Building an indie game with the players, in the open.',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Blog', link: '/blog/' },
      { text: 'Wiki', link: '/wiki/' },
      { text: 'YouTube', link: 'https://www.youtube.com/@devcol' },
      { text: 'Discord', link: 'https://discord.gg/REPLACE_ME' },
    ],

    sidebar: {
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
      { icon: 'x', link: 'https://x.com/REPLACE_ME' },
      { icon: 'discord', link: 'https://discord.gg/REPLACE_ME' },
      { icon: 'youtube', link: 'https://www.youtube.com/@devcol' },
    ],

    search: {
      provider: 'local',
    },

    footer: {
      message: 'Built in the open with devcol.',
      copyright: 'Copyright © 2026-present devcol',
    },
  },
})
