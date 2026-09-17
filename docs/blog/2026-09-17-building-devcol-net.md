---
title: Building devcol.net
date: 2026-09-17
---

# Building devcol.net

This is the first real devlog post — the placeholder that used to live here just said "replace this with real progress notes," so here's what actually happened getting this site off the ground.

## Getting it live

devcol.net runs on VitePress, deployed to GitHub Pages through a GitHub Actions workflow that builds and pushes on every commit to `main`. DNS sits on Cloudflare pointing at GitHub Pages, with GitHub handling the TLS certificate. No servers to manage, no hosting bill beyond the ~$12/year domain registration.

Ahead of applying for Google AdSense, About, Contact, and Privacy Policy pages went up first — table stakes for the application, and easy to get wrong by skipping.

## Migrating the projects

The Projects page originally had one-line bullets for each project with no real write-up behind them. Four of those already had full posts written on an old Blogspot — building an Unreal Engine 5 FPS in five days, the TEAM8 text-console RPG, and the two shipped Unity games (Rock Paper Scissors - Advance, Press Plane). Those got migrated over, each to its own page under `/projects/`, with real screenshots and video pulled in instead of just linking out.

The original Unity game write-ups turned out to be closer to store-listing copy than devlogs — short, promotional, no real substance. Rather than ship them as-is, they got expanded with actual design reasoning: why Press Plane's flight feels different from Flappy Bird's (it keeps your existing fall velocity instead of resetting it on tap, so holding down has to fight your own momentum), and what actually went into tuning Rock Paper Scissors - Advance's three difficulty modes so a game everyone already knows still holds attention past ten seconds.

## What broke along the way

A few real bugs turned up in the process, not just missing content:

- The itch.io social link was using `'itch.io'` as the icon name, which isn't one VitePress's default theme recognizes — it was silently rendering nothing. Swapped in a custom SVG icon instead.
- Leftover lowercase "devcol" branding survived in the FAQ and blog index from before the DevCol rebrand.
- A "Mobile" section heading on the Projects page didn't match the pattern of every other section being labeled by engine — renamed to "Unity" for consistency.

There was also a wrong assumption worth writing down: itch.io games looked like they should be embeddable and playable directly on this site via their "Embed" widget. They're not, at least not by default — the widget shows a preview card with a "Play on itch.io" button that opens a new tab, and directly hotlinking itch.io's own game CDN URL gets redirected to a "you should be using itch.io" page. Real playable embeds are just YouTube video and screenshot fallbacks for now.

## SEO groundwork

VitePress doesn't generate a sitemap out of the box, so `sitemap.xml` now gets written in a `buildEnd` hook straight from the site's page list — no extra dependency for something this small. A `robots.txt` points at it. The domain got verified in Google Search Console via a DNS TXT record on Cloudflare, and the sitemap got submitted. First submission attempt briefly showed "Couldn't fetch" with an "Unknown" type — turned out to be a timing hiccup right after domain verification, not an actual problem, and it resolved on its own after Search Console re-crawled.

## What's next

Five more projects are still sitting as one-line bullets, mostly because their only write-ups are Korean-only bootcamp assignment posts that need translating first. The wiki's lore and systems sections are still empty stubs. Both of those are the next real gaps to close.
