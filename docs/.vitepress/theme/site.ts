// Small site-wide settings used by the home page and footer.

// The project shown as "now building". Must match a `## Heading` in docs/blog/index.md.
// To switch projects later, change this and (optionally) the tags below.
export const nowBuilding = 'PSEUDO'
export const nowBuildingTags = ['Unreal Engine 5', 'Action RPG', 'Multiplayer']

// Rotating pill in the hero. "Latest DevLog · <date>" is added after these from the blog index.
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

// Footage slot under the hero. Leave src empty to show the placeholder; add your own clip later, e.g.
//   src: '/media/tumble-teams.mp4', poster: '/media/tumble-teams.jpg' (files go in docs/public/media/).
export const footage: { src: string; poster: string } = { src: '', poster: '' }

// "Show the work [video] while it's happening." Both videos are segments of existing clips in docs/public/projects/.
// To use your own footage, drop the files in docs/public/ and change src / poster / start / end (seconds) here.
export const reel = {
  background: { src: '/projects/pawn-class-3d-character-1.mp4', poster: '/projects/h-pawn-calm-poster.jpg', start: 1, end: 6.5, rate: 0.5 },
  pill: { src: '/projects/game-loop-ui-redesign-1.mp4', poster: '/projects/h-gameloop-poster.jpg', start: 50, end: 58 },
}
