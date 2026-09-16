---
title: Rock Paper Scissors - Advance
outline: deep
---

# Rock Paper Scissors - Advance

*Unity — released on Google Play*

<img src="/projects/rock-paper-scissors-advance-icon.png" alt="Rock Paper Scissors - Advance app icon" width="160" />

A fast-paced mobile arcade game that pushes the classic rock-paper-scissors into reflex-test territory, across three modes:

1. **Regular Mode** — the classic version. You and the AI choose at the same time on the count of three; miss the timer and you lose.
2. **Response Mode** — the AI shows its hand first and you have to react with the counter-move before time runs out. The timer speeds up as your score climbs; any draw, wrong move, or timeout ends the run.
3. **Reverse Mode** — the win conditions are flipped (Rock beats Paper, Paper beats Scissors, Scissors beats Rock), so you have to think backwards under the same shrinking timer.

Built for mobile portrait play; on web, Rock/Paper/Scissors also map to the 1/2/3 keys. The web build doesn't run well in mobile browsers — the Android app is the intended way to play there.

## Design philosophy

Rock-paper-scissors is about as universally known as a game gets — nobody needs the rules explained, which was exactly the point of building on top of it. The real challenge wasn't teaching people how to play; it was taking a game everyone already "knows" and making it worth spending more than ten seconds on.

That mostly came down to tuning difficulty and mode variety rather than adding new mechanics on top of the core rules:

- **Regular Mode** keeps the original simultaneous-choice rules completely intact, so it works as an on-ramp — anyone can jump in without learning anything new, and it's the closest thing to "just playing rock-paper-scissors" in the game.
- **Response Mode** turns the same rules into a reaction test by revealing the AI's move first and shrinking the response window as the score climbs. Most of the actual design and tuning effort went here: the timer has to start slow enough to feel fair to a first-time player, but ramp up fast enough that even a sharp player eventually gets pushed into a mistake within a reasonable number of rounds, rather than being able to coast indefinitely on a lucky streak.
- **Reverse Mode** stacks the same shrinking-timer pressure on top of flipped win conditions, so the challenge stops being pure reflexes — it becomes about overriding the instinct to play "regular" rock-paper-scissors while already under time pressure. This mode exists specifically for players who found Response Mode too easy: instead of just making the timer even faster, it changes *what* they have to think about, which turned out to be a more interesting kind of hard than simply cranking up the difficulty number.

The goal across all three modes was to keep the barrier to entry at zero — everyone already knows rock-paper-scissors — while making the skill ceiling high enough that getting better at the game is actually about getting better at the game, not just memorizing a fixed pattern.

## Play on itch.io

<div style="max-width: 552px;">
<iframe src="https://itch.io/embed/4158865" width="100%" height="167" frameborder="0"><a href="https://devcol.itch.io/rock-paper-scissors-advance">Rock Paper Scissors - Advance by DevCol - Development Collaboration</a></iframe>
</div>

## Links

[Google Play](https://play.google.com/store/apps/details?id=com.devcol.rockpaperscissorsadvance) · [itch.io](https://devcol.itch.io/rock-paper-scissors-advance) · [Unity Play](https://play.unity.com/en/games/1f8670e1-ec5c-4918-8572-42315e8e17c8/rps-web-1) · [GitHub](https://github.com/devcol-main/Rock-Paper-Scissors-Advance) · [Trailer](https://youtu.be/JEYNSnYaz0o)
