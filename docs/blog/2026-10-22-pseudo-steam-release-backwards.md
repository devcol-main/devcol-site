---
title: "Planning a First Steam Release Backwards: Fees, Waiting Periods and Fixed Dates"
description: "How I worked out PSEUDO's first Steam release date by counting backwards from Steamworks rules: the 21-day wait after the app fee, the two-week Coming Soon minimum, one-to-five-day reviews for the store page and the build, what the store page needs, the content questionnaire for violence and simulated gambling, and why those dates stay fixed when development slips."
date: 2026-10-22
publishAt: 2026-11-03
track: "Steam release schedule"
outline: deep
tags: [Steam, Steamworks, Planning, PSEUDO]
---

# Planning a First Steam Release Backwards: Fees, Waiting Periods and Fixed Dates

PSEUDO is my first game headed for Steam. When I sat down to plan its release, the most useful thing I found was that the first release date isn't really something you pick. Steam has a few hard waiting periods for a new developer, and they chain together. Once you know them, the date falls out of the arithmetic, and so do the two or three days in the plan that must not move.

This post is that arithmetic, as I worked it out on October 22, 2026. The rules come from Valve's Steamworks onboarding documentation; check it yourself before relying on any number here, because these rules have changed before.

## The rules that set the pace

For a first product on a new Steamworks account, three rules matter:

1. **The app fee starts a 21-day clock.** Steam Direct costs $100 per product. After paying it, there's a 21-day waiting period before that product can be released. The fee isn't refundable, but it comes back in a payout once the game has earned $1,000 in adjusted gross revenue.
2. **The Coming Soon page has to be public for at least two weeks** before release. You can't put up a store page the day before launch.
3. **Both the store page and the build are reviewed**, and each review takes between one and five days. Nothing goes public until it passes.

None of this is difficult. The trap is that each rule looks harmless on its own, and together they add up to more than a month that has nothing to do with whether the game is finished.

## Counting backwards

I started from the release date I wanted and worked back through each constraint.

**Target release: Monday, November 23.**

| Step | Rule | Latest date | Release possible from |
|---|---|---|---|
| Pay the app fee | 21 days before release | October 25 | November 15 |
| Submit the store page for review | 1 to 5 days of review, then it has to go public | October 28 | — |
| Coming Soon page public | At least 2 weeks before release | November 2 | November 16 |
| Submit the release build for review | 1 to 5 days of review | November 16 | — |
| Release | — | **November 23** | — |

Two things are worth noticing.

**The fee is the first deadline, not the last.** It's tempting to treat paying as a formality you do when the game is ready. But the 21-day clock starts at payment, so paying late pushes the earliest possible release by exactly the number of days you waited. Paying on October 25 makes November 15 the earliest release date, comfortably ahead of the target.

**The Coming Soon page is the real bottleneck.** Two weeks of public visibility from November 2 gives November 16 as the earliest release by that rule. To be public by November 2, the store page has to be submitted with room for a five-day review, which puts the submission on October 28. And to submit a store page, you need the material for it, which means the game has to look like something well before it's finished.

The build gets the same treatment at the other end: submitted on November 16, a full week before release, so a failed review and a resubmission still fit.

## What the store page needs

The October 28 submission is the date that actually pulls on development, because a store page needs real material from the game:

- A **capsule image** (the key art Steam shows in lists and on the page header, in several sizes).
- **At least five screenshots** from the game.
- A **short trailer**.
- A **description**, which for PSEUDO means English first, and Korean as well.
- The **content survey**, Steam's questionnaire about mature content.

Screenshots and a trailer need the game to look like itself: the character, the combat effects, a stage that isn't grey boxes. That's why the store page date shaped the development plan more than the release date did. The game doesn't have to be done in late October. It has to be *presentable*.

### The content survey

PSEUDO needs two honest answers in that questionnaire:

- **Violence and gore.** The game has blood effects, finishers and, in one stage, dismemberment. It aims for an adult rating on purpose.
- **Simulated gambling.** The core mechanic is 2d6 dice, and the hub has a planned casino where you stake in-game currency. Nothing in the game involves real money or paid currency, but rolling for outcomes and a casino room are exactly what this question is about. It's better to declare it plainly than to have a reviewer find it.

I'd rather answer these early, on the store page submission, than discover at build review that the page and the game don't match.

## Fixed dates and moving dates

The most useful rule I took from this exercise: **the Steam dates don't move when development slips.**

Development dates move all the time. A system takes two days instead of one, a bug eats an evening, a feature gets cut and another gets pulled forward. That's normal, and my development plan has been rewritten more than once since I started.

The Steam dates are different. Each one is the latest possible day for a step whose consequences are fixed in days: pay later, release later, one day for one day. If I let a slipping feature push the fee payment, the release date moves with it, and so does everything downstream. So the plan treats the Steam steps as fixed and lets the development work around them absorb any slip. When something has to give, it's scope, not the fee date.

It also changes how I think about "done". The order is:

1. Presentable enough for screenshots and a trailer, by the store page date.
2. Feature-complete, well before the release build is due.
3. Stable, by the build submission.

Each of those has its own date, and none of them is the release date.

## What I'd tell myself at the start

- **Read the onboarding docs before planning anything else.** The waiting periods decide the earliest date you can ship, so they belong at the start of the plan, not the end.
- **Pay the fee as soon as you're sure you're shipping.** The fee doesn't commit you to a release date, but not paying commits you to a later one.
- **The store page is a deliverable, not marketing to do later.** It needs art, screenshots and a trailer, and it has its own review.
- **Build in the five-day worst case everywhere.** Every review on this list can take five days. Planning for one is planning to be late.

Whether PSEUDO actually ships on November 23 is a different question, and the posts in this series will show how close the build gets. But the date itself was never a guess. It was 21 days, two weeks and two reviews, counted backwards.
