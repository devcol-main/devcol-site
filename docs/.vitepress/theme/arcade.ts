import type { Item } from './projects'

// Arcade: games playable right on the site. Each entry has a play page at /arcade/<slug> (game first,
// no sidebar) and a longer write-up at /projects/<slug>. The build itself lives in public/games/<slug>/.
export const games: Item[] = [
  {
    title: 'Stack Up',
    href: '/arcade/stack-up',
    blurb: 'One button. Drop the sliding block on the tower; whatever hangs over the edge is sliced off.',
    tags: ['One button', 'Mobile', 'Desktop'],
    video: '/projects/stack-up-1.mp4',
    poster: '/projects/stack-up-1-poster.jpg',
    fit: 'contain',
    badge: 'Play now',
  },
  {
    title: 'Bug Squash',
    href: '/arcade/bug-squash',
    blurb: 'Whack-a-mole in a retro terminal. Squash the bugs before they hide, and leave the working features alone.',
    tags: ['Tap or keyboard', 'Mobile', 'Desktop'],
    video: '/projects/bug-squash-1.mp4',
    poster: '/projects/bug-squash-1-poster.jpg',
    fit: 'contain',
    badge: 'Play now',
  },
  {
    title: 'Bukang Run',
    href: '/arcade/bukang-run',
    blurb: 'A three-lane swimming runner. Guide the shark out of a Busan harbor canal past nets, pumps and camera flashes.',
    tags: ['Swipe or keyboard', 'Mobile', 'Desktop'],
    img: '/projects/bukang-run-gameplay.png',
    fit: 'contain',
    badge: 'Play now',
  },
]
