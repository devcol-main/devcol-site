export type Item = {
  title: string
  href: string
  blurb: string
  tags: string[]
  img?: string
  video?: string
  poster?: string
  fit?: 'cover' | 'contain'
  badge?: string
}
export type Group = { id: string; title: string; note?: string; items: Item[] }

export const groups: Group[] = [
  {
    id: 'unreal-engine',
    title: 'Unreal Engine',
    items: [
      {
        title: 'Building an Unreal Engine 5 FPS in 5 Days',
        href: '/projects/building-an-unreal-engine-5-fps-in-5-days',
        blurb: 'A first-person shooter built from scratch in five days.',
        tags: ['Unreal Engine 5', 'Blueprint'],
        img: '/projects/fps-5-days-1.png',
      },
    ],
  },
  {
    id: 'unreal-tutorials',
    title: 'Unreal Engine Tutorials',
    items: [
      {
        title: 'Game Loop & UI Redesign',
        href: '/projects/game-loop-ui-redesign',
        blurb: 'A three-wave level structure with a reworked UI.',
        tags: ['Unreal Engine 5', 'C++'],
        video: '/projects/game-loop-ui-redesign-1.mp4',
        poster: '/projects/game-loop-ui-redesign-1-poster.jpg',
      },
      {
        title: 'Pawn Class 3D Character',
        href: '/projects/pawn-class-3d-character',
        blurb: 'A custom Pawn class driven by the Enhanced Input system.',
        tags: ['Unreal Engine 5', 'C++'],
        video: '/projects/pawn-class-3d-character-1.mp4',
        poster: '/projects/pawn-class-3d-character-1-poster.jpg',
      },
      {
        title: 'Rotation, Movement, Randomization, Spawning',
        href: '/projects/rotation-movement-randomization-spawning',
        blurb: 'Rotating and moving platforms driven by Tick, plus random spawning.',
        tags: ['Unreal Engine 5', 'C++'],
      },
    ],
  },
  {
    id: 'cpp',
    title: 'C++',
    items: [
      {
        title: 'TEAM8-Text-Console-RPG',
        href: '/projects/team8-text-console-rpg',
        blurb: 'A team-built, text-based console RPG with auto-battles and a split-screen layout.',
        tags: ['C++', 'Team project'],
        img: '/projects/team8-text-console-rpg-1.jpg',
      },
    ],
  },
  {
    id: 'unity',
    title: 'Unity',
    items: [
      {
        title: 'Rock Paper Scissors - Advance',
        href: '/projects/rock-paper-scissors-advance',
        blurb: 'Released on Google Play, playable in the browser.',
        tags: ['Unity', 'Google Play'],
        img: '/projects/rock-paper-scissors-advance-icon.png',
        fit: 'contain',
        badge: 'Released',
      },
      {
        title: 'Press Plane',
        href: '/projects/press-plane',
        blurb: 'Released on Google Play, playable in the browser.',
        tags: ['Unity', 'Google Play'],
        img: '/projects/press-plane-1.png',
        badge: 'Released',
      },
    ],
  },
  {
    id: 'tools',
    title: 'Tools (AI-Assisted)',
    note: 'Small utilities I planned and built with Claude. I wrote the plan and requirements, then tested and revised each one until it worked the way I wanted.',
    items: [
      {
        title: 'iCUE Scheduler',
        href: '/projects/icue-scheduler',
        blurb: 'Switches Corsair iCUE profiles and keyboard brightness by time of day.',
        tags: ['Windows', 'PowerShell', 'WPF'],
        img: '/projects/icue-scheduler-home.png',
      },
      {
        title: 'Brightness Scheduler',
        href: '/projects/brightness-scheduler',
        blurb: 'Schedules brightness and contrast for laptop screens and external monitors.',
        tags: ['Windows', 'C#', '.NET 10'],
        img: '/projects/brightness-scheduler-dashboard.png',
      },
      {
        title: 'NewsBriefing',
        href: '/projects/news-briefing',
        blurb: 'A market briefing written and committed every morning at 07:30 KST.',
        tags: ['Claude routine', 'Slack', 'Markdown'],
      },
    ],
  },
]

const byHref = new Map(groups.flatMap((g) => g.items).map((it) => [it.href, it]))

// Shown on the home page, in this order.
export const featured: Item[] = [
  '/projects/building-an-unreal-engine-5-fps-in-5-days',
  '/projects/game-loop-ui-redesign',
  '/projects/press-plane',
  '/projects/rock-paper-scissors-advance',
  '/projects/pawn-class-3d-character',
  '/projects/team8-text-console-rpg',
].map((href) => byHref.get(href)!)
