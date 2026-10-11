---
title: Rock Paper Scissors - Advance
outline: deep
---

# Rock Paper Scissors - Advance

*Unity, released on Google Play*

<img src="/projects/rock-paper-scissors-advance-icon.png" alt="Rock Paper Scissors - Advance app icon" width="160" />

Rock Paper Scissors - Advance is a fast mobile arcade game built on the old hand game everyone knows. It tests your reflexes and your head across three modes. It's made for portrait phones and runs in short rounds.

## The three modes

**Regular Mode** is the classic game. You and the AI choose at the same moment on a count of three. If the timer runs out before you choose, you lose. The rules are the ones you already know: Rock beats Scissors, Scissors beats Paper, Paper beats Rock.

**Response Mode** reverses the order. The AI shows its hand first, and you have to pick the winning counter before the time is up. The timer gets shorter as your score goes up. A draw, a wrong pick, or running out of time ends the run.

**Reverse Mode** flips the win conditions: Rock beats Paper, Paper beats Scissors, and Scissors beats Rock. The AI shows its move and you pick the "reverse winner" in time. It speeds up and ends on mistakes the same way Response Mode does.

## How the modes play

Regular Mode asks almost nothing new of you, because everybody already knows the rules. In Response Mode the AI's move is already on screen, so there's nothing to guess. The challenge is how quickly you can answer, and it gets harder because the timer keeps shrinking. Reverse Mode uses the same speed pressure, but now the answer your instinct gives you is wrong. You have to override the rule you've known since childhood while the clock is running.

## Why I built it this way

Since everyone already knows rock-paper-scissors, I didn't have to teach the rules. The harder problem was making a game people already know fun to keep playing, and deciding how the difficulty should rise as a run goes on. I spent a lot of my time on those two questions, and they're the reason it has three modes with a timer that tightens as you score, and not a single plain match.

## How it works in the code

The modes share one structure. `RPS` is an abstract base class, and `RegularRPS`, `ResponseRPS`, and `ReverseRPS` extend it. The base class holds what every mode needs: the countdown coroutine, the background color, the start and end screens, and the new-high-score effect. Each mode fills in its own opening scene and title text. `InGameSystem` sits in the middle. It tracks which mode is running, handles start, restart, and the tutorial, and it's what calls the AI and the result check. `Player` holds the three buttons, `AI` makes the opponent's pick, `Result` decides the outcome, and `InGameStats` counts wins, draws, and losses separately for each mode.

### The opponent is random

The AI doesn't look at what you did before. It picks a number from 0 to 2, and each number is one hand:

```csharp
// InGameSystem.cs
public int RandomGenerator()
{
    int min = 0;
    int max = 2;
    return Random.Range(min, (max + 1));   // the integer overload excludes the upper bound
}
```

In Regular Mode the pick happens only when the countdown ends. `FinalizeDecision()` shows the AI's hand and then calculates the result, so there's nothing to read in advance. In Response and Reverse mode the AI's hand is shown first, and the countdown starts after it.

### Judging is spelled out per mode

`Result.CalculateResult()` switches on the mode and calls one method for each. They compare the two hands directly instead of sharing a rule table. This is the player-wins condition in Response mode, followed by the one in Reverse mode:

```csharp
// Response (and Regular): the usual rules
player == ROCK     && ai == SCISSORS
|| player == PAPER    && ai == ROCK
|| player == SCISSORS && ai == PAPER

// Reverse: the same hands, flipped
player == ROCK     && ai == PAPER
|| player == PAPER    && ai == SCISSORS
|| player == SCISSORS && ai == ROCK
```

The snippet shortens the real enum names (`RockPaperScissors.ROCK` and so on). The Reverse rule is just the Response rule with the winner and loser swapped, so each mode's conditions stay easy to read at the cost of some repetition.

### How the timer tightens

Regular Mode always counts down from 3. Response and Reverse mode use a countdown that speeds up. Inside its loop, every frame adds the frame time plus a speed value to the elapsed time:

```csharp
// RPS.cs
[SerializeField] protected float gameStartingSpeed = 0.05f;
[SerializeField] protected float currentGameSpeed = 0.05f;
protected const float gameSpeedUpValue = 0.005f;

elapsedTime += (Time.deltaTime + currentGameSpeed);   // inside SpeedingCountDownCoroutine
```

`Level.CheckLevel()` runs after each win in those two modes, using the number of wins in a row. Levels come at 2, 5, 8, 10, and 15 wins. After that the next one comes at 19 wins, then every 3 wins (22, 25, and so on). Each level-up calls `IncreaseGameSpeed()`, which adds 0.005 to the speed value. The "3 seconds" on screen is really a counter filling up faster, so the same count takes less real time. `GameManager` sets `Application.targetFrameRate` to 30. At 30 frames per second, that works out to about:

| Wins in a row | Speed value | Real time for the 3-2-1 |
|---|---|---|
| 0 | 0.050 | 1.2 seconds |
| 15 | 0.075 | 0.9 seconds |
| 31 | 0.100 | 0.75 seconds |

These are worked out from the default values in the script, not timed in the running game. The speed values are serialized fields, so the scene can override them. A loss calls `ResetGameSpeed()`, which puts the speed back to the starting value for the next run.

The speed value is added per frame rather than per second. The countdown therefore depends on the frame rate, and capping the frame rate is what keeps it consistent between devices.

## Controls

On a phone you tap. In the browser you can click, or press 1 for Rock, 2 for Paper, and 3 for Scissors. The web build doesn't run well in mobile browsers, so on a phone use the Android app.

## Play in browser

<div style="max-width: 400px;">
<iframe src="https://itch.io/embed-upload/15989559?color=333333" width="100%" height="600" frameborder="0" allowfullscreen></iframe>
</div>

[Google Play](https://play.google.com/store/apps/details?id=com.devcol.rockpaperscissorsadvance) · [itch.io](https://devcol.itch.io/rock-paper-scissors-advance) · [Unity Play](https://play.unity.com/en/games/1f8670e1-ec5c-4918-8572-42315e8e17c8/rps-web-1) · [GitHub](https://github.com/devcol-main/Rock-Paper-Scissors-Advance) · [Trailer](https://youtu.be/JEYNSnYaz0o)
