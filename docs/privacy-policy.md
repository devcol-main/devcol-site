---
title: Privacy Policy
---

# Privacy Policy

**Last updated: October 30, 2026**

This Privacy Policy describes how DevCol ("we," "us," or "this site," reachable at [devcol.net](https://devcol.net)) handles information when you visit.

## Information We Collect

DevCol does not require you to create an account or submit personal information to read the site. The only thing you can choose to publish is a nickname on the online game leaderboard (see below). We do not knowingly collect personal information from visitors under the age of 13.

## Cookies and Third-Party Services

Like most websites, DevCol may use cookies and similar technologies through third-party services, including:

- **Google AdSense**: may serve ads and use cookies (including the DoubleClick DART cookie) to serve ads based on your prior visits to this or other websites. You can opt out of personalized advertising by visiting [Google Ads Settings](https://adssettings.google.com/) or [www.aboutads.info](https://www.aboutads.info/choices/).
- **Google Analytics** (if enabled), collects anonymized usage statistics (pages visited, time on site, general location) to help us understand how the site is used.

These third parties may use cookies, web beacons, and similar technologies to collect information about your visits to this and other websites in order to provide advertisements about goods and services of interest to you. If you wish to opt out of this, you may do so by visiting the Google Ads Settings link above.

## Site Analytics

DevCol runs its own small analytics service (source code: [devcol-analytics](https://github.com/devcol-main/devcol-analytics)) to see which pages are read and how the games are played. It works without cookies and without storing anything that identifies you.

- **What is recorded**: the page path, the referring website's domain (not the full address), any `utm_` campaign tags in the link, time spent on the page and how far you scrolled, and for the games, game starts, stages cleared, scores, and play time. The server adds your country (from the network, not your exact location), the device type (mobile, tablet, or desktop), and the browser family.
- **What is not recorded**: your IP address and your full browser user-agent string are never stored. No cookies are set. A random session ID is kept in your browser's session storage and is deleted when you close the tab.
- **Counting visitors**: to count unique visitors per day, the server combines your IP address and user-agent with a random value that changes every day and stores only a one-way hash of the result. The daily value is deleted after two days, so a visit cannot be linked to visits on other days.
- **Do Not Track**: if your browser sends Do Not Track or Global Privacy Control, the analytics script does nothing and nothing is sent.
- **Retention**: individual events are deleted after 90 days. Only daily totals (for example, page views per day) are kept after that.
- **Who sees it**: the data is stored in Cloudflare (D1) and is only visible to DevCol. Aggregated totals are published on the [Site Stats](/stats) page, where any number under 5 is shown as "<5".

## Browser Games

The games under [Arcade Web](/projects/arcade-web) (such as Stack Up and Bug Squash) save a few things in your browser's local storage so they work the next time you visit: your best score, a local copy of your scores, the nickname you type, a randomly generated player ID, an online leaderboard key (described below), and settings like sound volume and reduced motion. The player ID never leaves your device. You can remove the local data with the reset option in each game or by clearing your browser's site data.

## Online Leaderboard

The games share an online Top 10 on devcol.net. There is no account or login. Submitting a score is optional: nothing is sent until you press Submit after a game.

- **What is sent when you submit**: the game name, the nickname you typed, your score, a few game numbers (for example floors reached or best combo), and how long the run took. The anonymous gameplay events under Site Analytics are separate and do not include your nickname.
- **What is published**: your nickname (or `Player` followed by four digits, see below), your best score in each game, those game numbers, and the date. Only your best score per game is kept.
- **Leaderboard key**: on your first submit the server creates a random key and gives it to your browser, which stores it in local storage. The server keeps only a one-way hash of it. The key links your later scores to the same entry and lets you delete your scores yourself. It is not linked to your player ID, your IP address, or any account.
- **What is not stored**: your IP address, your full browser user-agent string, and cookies. To limit abuse (for example too many submits per minute), the server counts requests using the same daily-changing one-way hash described under Site Analytics; those counters are deleted within a day.
- **Nickname checks**: nicknames may only use letters, Korean (Hangul) characters, numbers and single spaces, 2 to 12 characters. Each new nickname is checked against a word list and, for names that pass, by an automated text classifier (Cloudflare Workers AI, run by Cloudflare on our behalf; only the nickname is sent to it, and the result is cached so the same name is not sent again). A name that fails any check is published as `Player####` instead and is not attached to your entry; the checked names themselves are kept, without any link to who typed them, so the same name is not checked twice. If three different people report a name (each report is stored with the same daily-changing one-way hash, not an IP address), it is also replaced with `Player####` until it is reviewed. DevCol may hide, rename, or remove entries and block players that abuse the leaderboard.
- **Retention**: an entry and its key are deleted 12 months after that player's last submit. Reports are deleted after 90 days.
- **Deleting your scores**: open Options in any of the games and choose **Online scores → Delete mine**. This removes your entries from every game and deletes your key. If you cleared your browser data and lost the key, contact us (see [Contact](/contact)) with the game, the name shown, the score, and roughly when you played, and we will delete the entry.
- **Where it is stored**: Cloudflare (Workers and D1), the same service as the site analytics. Source code: [devcol-analytics](https://github.com/devcol-main/devcol-analytics).

## Data We Do Not Collect

We do not sell your personal data. We do not collect payment information, passwords, or account credentials, as the site has no login system. Please do not use your real name or other personal details as a leaderboard nickname.

## Your Rights

Depending on your location (e.g., under GDPR in the EU/EEA or CCPA in California), you may have rights to access, correct, or delete personal data collected about you by third-party services like Google. Please refer to [Google's Privacy Policy](https://policies.google.com/privacy) for details on data Google collects and how to exercise those rights.

## Children's Privacy

This site is not directed at children under 13, and we do not knowingly collect personal information from children.

## Changes to This Policy

This policy may be updated as the site evolves. Changes will be posted on this page with an updated "Last updated" date.

## Contact

Questions about this policy can be sent to **devcol.main@gmail.com**, or via the [Contact](/contact) page.
