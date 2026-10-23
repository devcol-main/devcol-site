---
title: "Cookie-Free Analytics for devcol.net on Cloudflare Workers"
description: "I wanted to know which posts get read and how far people get in the games, without cookies or a third-party tracker. Notes on a small analytics service built on Cloudflare Workers and D1: what it records, how it counts visitors without storing IPs, and how a new game gets tracked with two lines of code."
date: 2026-10-23
publishAt: 2026-10-30
track: "Site analytics"
outline: deep
tags: [Cloudflare Workers, D1, Privacy, Web]
---

# Cookie-Free Analytics for devcol.net on Cloudflare Workers

Until now I had no idea which DevLog posts anyone read, where readers came from, or whether anyone who opened Stack Up got past the first few floors. I wanted those answers without adding a cookie banner or sending visitors to a third-party tracker, so I built a small analytics service of my own. It runs on Cloudflare Workers with a D1 database, stays inside the free tier, and the totals are public on the [Site Stats](/stats) page.

## What it records

The site loads one script, `/t.js`, about 1.7 KB with no dependencies. It sends a few kinds of events:

| Event | When |
|---|---|
| `pageview` | first load, and every page change inside the site |
| `page_leave` | when the tab is hidden or you move to another page, with time on page and how far you scrolled |
| `game_start` | when a game page loads |
| `stage_clear` | when a game reaches a stage or milestone |
| `game_over` | at game over, with the stage, score, and play time |

The server adds the country, device type, and browser family, and keeps only the referring site's domain, not the full address.

The script does nothing at all if the browser sends Do Not Track or Global Privacy Control, or if it is an automated browser.

## Counting visitors without storing who they are

Unique visitors are the hard part without cookies. The Worker hashes the IP address and user-agent together with a random value that changes every day, and stores only the hash. Same person on the same day, same hash. The next day the random value is different, so the hashes can't be matched across days, and the old value is deleted after two days. The IP address and full user-agent never reach the database.

The trade-off is that "visitors" means unique visitors per day. Someone who comes back on three days counts three times, and the stats page says so.

## Keeping the noise out

Most traffic to a small site is not people. Before anything is stored, the Worker drops requests that:

- don't come from devcol.net
- have a bot-like user-agent (crawlers, link previews, headless browsers)
- are larger than 2 KB or have missing or malformed fields
- come from a visitor that already sent 60 events in the last minute

## Raw events, then daily totals

Every event goes into one `events` table. A scheduled job runs at 00:10 KST, adds up the previous day into a `daily_stats` table (page views, visitors, views per page, plays and best score per game, traffic sources), deletes raw events older than 90 days, and removes the expired daily random values.

The public page only ever reads `daily_stats`, and any number below 5 is shown as "<5" so a single visit can't be picked out. The detailed dashboard, with funnels and score histograms per game, sits behind Cloudflare Access.

## New games without touching the server

There will be more games, and I didn't want to edit the server each time. The game ID comes from the URL: anything under `/games/<slug>/` is that game, so a new folder is tracked as soon as its page loads `/t.js`. Game starts and play time come for free. The only game code needed is two calls, one when a stage is cleared and one at game over. The dashboard and the stats page build their game lists from whatever is in the database.

Stack Up reports a stage at each floor milestone. Bug Squash has no levels, so its one stage boundary is the moment the board grows from 3x3 to 4x4.
