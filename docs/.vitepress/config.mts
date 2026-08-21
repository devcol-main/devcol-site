import { defineConfig } from 'vitepress'

export default defineConfig({
  title: 'DevCol',
  description: 'DevCol — development collaboration. Building an indie game with the players, in the open.',
  cleanUrls: true,
  lastUpdated: true,

  head: [
    ['link', { rel: 'icon', href: '/favicon.ico' }],
  ],

  themeConfig: {
    nav: [
      { text: 'Blog', link: '/blog/' },
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
      { icon: 'discord', link: 'https://discord.gg/BK4bvy8qS' },
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
