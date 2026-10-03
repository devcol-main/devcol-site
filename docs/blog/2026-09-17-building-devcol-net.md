---
title: Building devcol.net
date: 2026-09-17
---

# Building devcol.net

This is the first real post on the DevLog. The placeholder that used to sit here said "replace this with real progress notes," so here are the actual notes on getting this site running.

## Getting it online

The site is built with VitePress and hosted on GitHub Pages. A GitHub Actions workflow builds and deploys it on every push to `main`. DNS is on Cloudflare pointing at GitHub Pages, and GitHub issues the TLS certificate. The only recurring cost is the domain, about $12 a year.

Before applying for Google AdSense I added the About, Contact, and Privacy Policy pages, since the application expects them.

## Moving the projects over

The Projects page started as one-line bullets with nothing behind them. Four of those projects already had full write-ups on an old Blogspot blog: the Unreal Engine 5 FPS I built in five days, the TEAM8 text RPG, and the two Unity games, Rock Paper Scissors - Advance and Press Plane. I moved each of them to its own page under `/projects/`. The screenshots and videos are on the page now instead of linked out. Later I moved over the other three Unreal projects from my Tistory blog, which were only in Korean.

Moving them showed me how thin the Unity game pages were. The original text read like a store listing. I added what I could say with confidence: why Press Plane handles falling speed differently from Flappy Bird, and why Rock Paper Scissors - Advance has three modes.

## Things that broke

- The itch.io link in the header used `'itch.io'` as an icon name, which VitePress's default theme doesn't have, so nothing rendered. I swapped in an SVG. The first SVG I used wasn't itch.io's real logo and looked like noise at that size, so I replaced it with the icon from itch.io's own logo file.
- Two pages still said "devcol" in lowercase after I changed the branding to "DevCol".
- The "Mobile" section on the Projects page was the only one not named after an engine, so it became "Unity".
- The Discord invite link had expired, and it was on six pages. I found out when I clicked it. The replacement is set to never expire.

I also got the itch.io embeds wrong the first time. The embed code on a game's page, `itch.io/embed/<game id>`, only draws a preview card with a "Play on itch.io" button. Linking directly to the game's CDN URL just redirects to a "you should be using itch.io" page. Games do play inline through a different URL, `itch.io/embed-upload/<upload id>`, which I only found by looking at how my old Tistory posts embedded them. Both games now play on their project pages.

## Search setup

VitePress doesn't generate a sitemap, so a `buildEnd` hook in the config writes `sitemap.xml` from the page list. There's a `robots.txt` that points to it. I verified the domain in Google Search Console with a DNS TXT record in Cloudflare and submitted the sitemap. The first submission showed "Couldn't fetch" with type "Unknown". The file was reachable and valid, and it cleared on its own a day later.

## Next

Three more projects were Korean-only, and I've now translated them. The wiki's Lore and Systems pages are still empty, so they're hidden until there's something to put in them.
