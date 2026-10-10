---
title: devcol.net
description: "How this website is built: VitePress on GitHub Pages, planned by me and written with Claude."
outline: deep
---

# devcol.net

*VitePress, Vue, GitHub Pages · AI-assisted (Claude)* · [GitHub: devcol-site](https://github.com/devcol-main/devcol-site)

This is the site you're reading. It holds the DevLog, the project write-ups, and the study notes, and I treat it as a project of its own. I decided what it should contain and how it should behave, Claude wrote most of the code, and I checked the result in the browser and sent it back until it was right.

![The devcol.net home page in dark mode](/projects/devcol-net-home.jpg)

## What it's built with

- **VitePress** generates the pages from Markdown. The home page and the navigation are a custom theme written with Vue.
- **GitHub Pages** hosts it. A GitHub Actions workflow builds and deploys the site on every push to `main`.
- **Cloudflare** holds the domain and DNS. GitHub issues the TLS certificate. The domain, about $12 a year, is the only recurring cost.
- Fonts are bundled with the site instead of loaded from a font service, and the scroll animations load only on the home page.

The sitemap is generated at build time, a `robots.txt` points to it, and search is VitePress's built-in local search.

## How the home page works

Most of the home page isn't typed in by hand. The number of posts, projects, and study notes on the cards, the build track for the game I'm working on, and the latest DevLog title all come from the files in the repository when the site is built. When I add a new DevLog post to the DevLog index, the home page picks it up. The project shown as "now building" is a single setting.

## The redesign

I redesigned the site in October 2026. I had several complete home page drafts made with different design skills in Claude Code, compared them side by side, and told Claude what I liked and didn't like in each. The final design combines pieces from several of them. The accent color is a blue, and the only red left on the page is the hook in the logo.

## What went wrong along the way

The [first DevLog post](/blog/2026-09-17-building-devcol-net) lists the early problems: a broken itch.io icon, an expired Discord invite on six pages, and itch.io embeds that only showed a preview card. The redesign added its own. A video used as a background opened on a title screen I didn't want visitors to see, and one scroll effect made the page stutter until profiling showed the browser was redrawing a large card on every frame.
