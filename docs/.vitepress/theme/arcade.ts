import type { Item } from './projects'

// Arcade: games playable right on the site. Each entry has a play page at /arcade/<slug> (game first,
// no sidebar) and a longer write-up at /projects/<slug>. The build itself lives in public/games/<slug>/.
// Listed newest first. `date` drives the Newest sort; Bug Squash shipped after Stack Up the same day, so the
// tie keeps this order. Popular sorts by plays from the public analytics summary.
export const games: Item[] = [
  {
    title: 'Jet Rush',
    date: '2026-11-13',
    href: '/arcade/jet-rush',
    blurb: 'An endless flying runner. Steer, climb and boost a jet through the gaps of a sun-bleached box city.',
    tags: ['Keyboard or touch', 'Mobile', 'Desktop'],
    img: '/projects/jet-rush-1.jpg',
    badge: 'Play now',
  },
  {
    title: 'Melon Merge',
    date: '2026-11-13',
    href: '/arcade/melon-merge',
    blurb: 'Drop fruit into a wooden crate. Two of a kind merge into the next bigger one, all the way up to a watermelon.',
    tags: ['Tap or keyboard', 'Mobile', 'Desktop'],
    img: '/projects/melon-merge-1.jpg',
    fit: 'contain',
    badge: 'Play now',
  },
  {
    title: 'Bug Squash',
    date: '2026-10-15',
    href: '/arcade/bug-squash',
    blurb: 'Whack-a-mole in a retro terminal. Squash the bugs before they hide, and leave the working features alone.',
    tags: ['Tap or keyboard', 'Mobile', 'Desktop'],
    video: '/projects/bug-squash-1.mp4',
    poster: '/projects/bug-squash-1-poster.jpg',
    fit: 'contain',
    badge: 'Play now',
  },
  {
    title: 'Stack Up',
    date: '2026-10-15',
    href: '/arcade/stack-up',
    blurb: 'One button. Drop the sliding block on the tower; whatever hangs over the edge is sliced off.',
    tags: ['One button', 'Mobile', 'Desktop'],
    video: '/projects/stack-up-1.mp4',
    poster: '/projects/stack-up-1-poster.jpg',
    fit: 'contain',
    badge: 'Play now',
  },
  // Unity games: the web builds are hosted on itch.io and embedded on the play page, so they send no plays to
  // the site analytics and rank last under Popular.
  {
    title: 'Press Plane',
    date: '2025-09-18',
    href: '/arcade/press-plane',
    blurb: 'Hold to power the engines and climb, release to fall. An endless sky run made in Unity.',
    tags: ['Hold to climb', 'Desktop', 'Unity'],
    img: '/projects/press-plane-1.png',
    badge: 'Play now',
  },
  {
    title: 'Rock Paper Scissors - Advance',
    date: '2024-07-02',
    href: '/arcade/rock-paper-scissors-advance',
    blurb: 'The old hand game against a shrinking timer, in three modes, including one where the rules are flipped.',
    tags: ['Click or 1-2-3', 'Desktop', 'Unity'],
    img: '/projects/rock-paper-scissors-advance-icon.png',
    fit: 'contain',
    badge: 'Play now',
  },
]
