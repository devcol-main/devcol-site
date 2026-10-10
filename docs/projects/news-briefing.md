---
title: NewsBriefing
outline: deep
---

# NewsBriefing

*Claude cloud routine, Markdown, Slack · AI-assisted (Claude)* · [GitHub: NewsBriefing](https://github.com/devcol-main/NewsBriefing)

NewsBriefing writes me a market briefing every morning at 07:30 KST. It covers my watchlist, exchange rates, and the market news that matters for them. Each briefing is committed to the repository as a Markdown file, and a Slack message lets me know it's ready. The briefings are written in Korean and meant to be read on a phone in about a minute.

There's no server and no paid API. The whole thing is a scheduled Claude routine that follows a written procedure, uses free public sources plus web search, and pushes its result to GitHub.

You can browse real output in the [`briefings/`](https://github.com/devcol-main/NewsBriefing/tree/main/briefings) folder.

## What it produces

The routine picks a mode based on the day:

| Day | Mode | Contents |
|---|---|---|
| Mon–Fri | Daily briefing | Three-line summary, KOSPI/KOSDAQ/S&P 500/NASDAQ, exchange rates, watchlist stocks plus the NASDAQ top 3 by market cap, up to 5 news items, today's schedule, outlook |
| Sat | Weekly recap | Weekly change for indices and stocks, best and worst performer with the reason, top 5 news of the week |
| Sun | Week ahead | Market holidays, economic data releases (FOMC, CPI, jobs, and Korean data), earnings dates, three things to watch |
| Last day of month | Monthly briefing | Added on top of that day's normal briefing |

Files land in `briefings/YYYY/<Month>/YYYY-MM-DD-NewsBriefing.md`. If the file for today already exists, the routine stops instead of overwriting it.

## How it works

The repository holds everything the routine needs:

- `briefing-prompt.md`: the step-by-step procedure for each mode, including holiday handling and a self-check list.
- `watchlist.md`: the stocks and sectors to follow. I keep this one myself.
- `sources.md`: which free sources to use for each kind of data, in priority order, plus the domains the cloud environment is allowed to reach.
- `templates/`: one output layout per mode.

Every morning the routine reads those files, collects the numbers, fills in the template, checks its own work against the list, commits the file, and posts to Slack through an incoming webhook. A bot account sends the message so that it arrives as a phone push notification.

## Rules it follows

Most of the work went into rules that keep the output trustworthy:

- **Every number and news item has a source and a timestamp.** Anything that can't be confirmed is marked "확인 필요" (needs checking) instead of guessed.
- **Cross-checking.** Where possible a value is checked against a second source. If the two disagree, both are shown and flagged.
- **Weekly changes are calculated, never copied.** While testing the first sample, search summaries gave the NASDAQ's weekly change as +1.21% when it was really +2.06%, and AMD's 5-day move as +24% when it was +12.65%. Now the routine takes two closing prices from the same source and computes the change with Python.
- **No buy/sell calls, price targets, or ratings.** An outlook only appears in its own section, and each one needs sourced reasons, the factors against it, and a confidence level. The next briefing checks whether the last outlook held up.
- **No copying article text.** News items are a headline and a one- or two-line summary in its own words.

## How it changed

- **v1:** weekday briefings only, saved to the repository.
- **v1.1:** a weekly recap on Saturday and a week-ahead preview on Sunday, so the routine now runs every day.
- **Monthly briefings** on the last day of each month, and briefings organized into year and month folders.
- **Outlook section.** The first version had no outlook at all. I loosened that to allow a sourced outlook. The first outlook had weak reasoning, since it treated "an event is scheduled" as a reason. So the rules were tightened: read the last five briefings first, and don't count a schedule or last week's move as evidence on its own.
- **Slack notifications** for each briefing and for errors.

This is for summarizing information only and is not investment advice.
