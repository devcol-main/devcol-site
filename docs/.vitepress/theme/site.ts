// Small site-wide settings used by the home page and footer.

// The project shown as "now building". Must match a `## Heading` in docs/blog/index.md.
// To switch projects later, change this and (optionally) the tags below.
export const nowBuilding = 'PSEUDO'
export const nowBuildingTags = ['Unreal Engine 5', 'Action RPG', 'Multiplayer']

// Rotating line in the hero. "Latest DevLog · <date>" is added after these from the blog index.
export const heroPhrases = ['Game Developer', 'Unreal Engine 5 · C++', 'Unity · C#', 'AI-Assisted Tools', 'Programmer']

// The person behind the site. Shown in the byline on DevLog and Study pages and in the page's
// structured data (schema.org author), both pointing at /about.
export const author = { name: 'In Goo Lee', handle: 'in9', link: '/about' }

export const links = {
  discord: 'https://discord.gg/7YTgpP8CCt',
  youtube: 'https://www.youtube.com/@devcol',
  itch: 'https://devcol.itch.io',
  github: 'https://github.com/devcol-main',
  x: 'https://x.com/DevCol_Main',
}
