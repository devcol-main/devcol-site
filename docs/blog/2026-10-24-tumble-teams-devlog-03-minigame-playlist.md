---
title: "Tumble Teams DevLog #3: Five Minigames on One Match Flow"
description: "Turning Tumble Teams into a lobby, minigame, result loop with a five-minigame playlist in Unreal Engine 5: a shared server-side match flow, per-minigame rules objects, GAS abilities and effects, greybox maps, and an honest list of what still hasn't been played."
date: 2026-10-24
publishAt: 2026-11-04
track: "Match flow, minigame playlist"
category: "DevLogs"
sidebar: "DevLog #3: Minigame Playlist"
outline: deep
tags: [UE5, GAS, Multiplayer]
---

# Tumble Teams DevLog #3: Five Minigames on One Match Flow

[DevLog #2](./2026-10-03-tumble-teams-devlog-02-input-and-pawn-init) was about groundwork: input, pawn initialization, and where the Ability System Component lives. Since then Tumble Teams has changed shape. It's no longer a set of separate test maps. It's now a playlist: players meet in a lobby, get split into two teams, play five minigames in a row, and return to the lobby with a series result.

This post covers that loop, the rules of each minigame, and how each one is built. Everything below is **code-complete but not yet playtested by people**. I'll be specific about what that means at the end.

## What changed in scope

Two decisions came first:

- **Tumble Teams ships as its own game** instead of being a warm-up for a bigger project.
- **The game went from three minigames to five.** Snowball Fight and Take The Ground were added, and Snowball Fight became the core minigame. Dodgeball and Tag moved to the bottom of the build order.

Because five minigames in about two weeks is tight, I also wrote down a cut order: Dodgeball goes first, then Tag, then the Snowball terrain visuals, then most of the Snowball item list.

| # | Minigame | One-line rule | Core tech |
|---|---|---|---|
| 1 | Obstacle Course | Team race, placement points averaged per player | Movement replication, goal detection, no GAS |
| 2 | Take The Ground | King of the hill on three platforms, best of 5 | Server-side capture check, reuses drop kick and stamina |
| 3 | Snowball Fight | Gather snow, lob snowballs, revive or shatter snowmen | GAS attributes, stacking status effects, projectiles |
| 4 | Tag | One team chases, tagged runners freeze | GAS ability + tagged effect, reuses the melee sweep |
| 5 | Dodgeball | Hit by an enemy ball means out | GAS throw ability with cooldown, reuses the snowball projectile |

Teams are two sides of 2 to 5 players each, so up to 5 vs 5. Uneven teams are allowed, which matters for scoring later.

## One match flow for every minigame

The main decision was to build the loop once and make each minigame plug into it, instead of letting each map own its own timer and win logic. Before this, the obstacle race's goal actor had its own 300-second timer and win rule. Now it only reports who crossed the line.

### Levels and travel

Each minigame has its own map, plus a lobby map. The server moves everyone with seamless `ServerTravel`. Teams and series points have to survive that travel, so they live in a server-side `UGameInstanceSubsystem` as a **locked roster** (player id to team index) plus the series score.

Restoring the team happens in `HandleStartingNewPlayer`. That's on purpose: seamless travel does **not** call `PostLogin`. It goes through `HandleSeamlessTravelPlayer`, which ends up in `HandleStartingNewPlayer`, and a normal join reaches the same function. One hook covers both paths.

One PIE note: seamless travel quietly falls back to hard travel in the editor unless `net.AllowPIESeamlessTravel=1` is set, so that's in the project config now.

### The phase state machine

On top of the engine's `MatchState`, the game state replicates its own phase:

```
WaitingForPlayers --(all roster players arrived, or 15 s)--> Countdown --> Playing
Playing --(rules report a result, or time up)------------------------------> RoundResult
Playing --(time up, rules want overtime, overtime allowed)--> Overtime --> RoundResult
RoundResult --(match not decided)--> Countdown (next round)
RoundResult --(match decided)------> MinigameResult --> Travelling (next minigame or lobby)
```

The transition logic is a plain C++ struct with no UObject and no world. It takes the definition values, the current time, and the rules' verdicts, and returns the phase and its end time. The GameMode drives it with one timer. Because it doesn't need a world, the transitions are covered by unit tests that run headless.

Replicated state is minimal: the phase, its start and end server time, the round index, and per-team round wins and series points. **Clients compute the remaining time themselves** from the phase end time and the server clock, so there are no per-second RPCs. The "Final 10 Seconds" alert in Take The Ground is also detected locally, when the HUD sees the time cross a threshold.

### Each minigame is a data asset plus a rules object

A minigame definition is a `UPrimaryDataAsset` with the map, a rules class, an optional rules config asset, and the numbers: countdown, round length, max rounds, wins needed, overtime, when to hide the timer, warning thresholds. The playlist is another data asset listing the five definitions in order.

| Minigame | Round | Rounds | Overtime |
|---|---|---|---|
| Obstacle Course | 240 s | 1 | off |
| Take The Ground | 60 s | best of 5 (first to 3) | off |
| Snowball Fight | 5:00 | 1 | 3:00 if survivors are equal |
| Tag | 60 s | 2 (roles swap) | off |
| Dodgeball | 90 s | best of 3 (first to 2) | off |

Every round starts with a 3-second countdown with movement locked.

The rules object is server-only and created per minigame from the definition. This is the whole interface:

```cpp
UCLASS(Abstract)
class UTumbleMinigameRules : public UObject
{
    GENERATED_BODY()
public:
    virtual void Initialize(ATumbleGameMode* InGameMode, const UTumbleMinigameDefinition* InDefinition);
    virtual void OnRoundStarted(int32 RoundIndex) {}
    virtual void OnRoundEnded(const FTumbleRoundResult& Result) {}
    virtual FTumbleRoundResult EvaluateTimeUp(bool bInOvertime) PURE_VIRTUAL(...);
    virtual void OnResetPlayersForRound(int32 RoundIndex) {}
    virtual void OnPlayerLeft(APlayerState* PlayerState) {}
    virtual void OnPlayerRestarted(AController* Controller) {}
    // Default: first to N wins / max rounds / more wins / draw.
    virtual bool IsMatchDecided(const TArray<FTumbleTeamMatchInfo>& Teams, int32 RoundsPlayed,
                                int32& OutWinner, bool& bOutDraw) const;
};
```

Most minigames only implement `EvaluateTimeUp` and, for an early finish, call `ReportRoundResult` on the GameMode. Only Tag overrides `IsMatchDecided`.

A minigame win is worth one series point, and the team with more points after the playlist wins the series.

### Lobby and teams

- On join, a player goes to the smaller team.
- When enough players are in (4 in the shipping settings, 2 for editor testing), a 5-second countdown starts. At that point teams are **rebalanced** so they differ by at most one, and the roster locks.
- Once the countdown starts, joins are refused with "Match in progress." There are no mid-minigame joiners to handle.
- After a series, the lobby waits about 10 seconds before counting down again, so the result screen doesn't get skipped.

### Round reset and the ASC that outlives the pawn

Between rounds every player is respawned at a team-tagged `PlayerStart`. Two details took some care:

- `RestartPlayerAtPlayerStart` doesn't move an existing pawn. The reset unpossesses and destroys the pawn, then calls `RestartPlayer`.
- The Ability System Component lives on the PlayerState (see DevLog #2), so it **survives the respawn along with any effects and cooldowns on it**. The GameMode cancels running abilities and removes cooldown effects, and the character's `ResetVitals` (called from `PossessedBy`) resets health and stamina and removes per-minigame state. That one cleanup point turned out to matter for every GAS minigame below.

The countdown lock is a loose gameplay tag, `State.MovementLocked`, set with `TagAndCountToAll` replication. The `TagOnly` mode uses minimal replication, which skips the owning client, and the owner is exactly the client that needs it. The movement component returns zero max speed and blocks jumping while the tag is present, so the owning client predicts the lock instead of getting corrected. Look input is untouched, so you can turn the camera during "3, 2, 1".

## The five minigames

### 1. Obstacle Course

The map is the existing multiplayer PCG dungeon, now running on the match flow.

- Placement points: first place gets points equal to the player count, then one less per place. Players who don't finish get 0.
- **The team's score is the average per member**, not the total. A 3-player team shouldn't beat a 2-player team just by having more people. There's a 3 vs 2 test for exactly that.
- The round ends when everyone has finished or after 240 seconds. Equal averages are a draw.
- A player who leaves stays in the team's denominator with whatever points they had.

The goal actor is now just a sensor that reports finishers.

### 2. Take The Ground

A king-of-the-hill arena: a gold main platform in the center and two teal sub platforms, all greybox.

- The platforms are 120 cm high. The current character's jump apex is about 184 cm and the default max step height is 45 cm, so **you can jump onto a platform but not walk onto it**.
- When the 60-second round ends, the server counts each team's players on each platform. The team with strictly more players gets it: **main 4 points, sub 2 points**. A tie means nobody gets that platform.
- Higher total wins the round. Equal totals are a draw round, and nobody gets a win.
- Best of 5, first to 3. Because draws give no win, five rounds can end without anyone at 3. Then more wins takes it, otherwise it's a draw.
- The timer hides at 10 seconds left and a "FINAL 10 SECONDS" alert shows.

The capture check is **a geometric cylinder test on the server at time-up, not an overlap volume**. Scoring only happens at one instant, so there's no need for overlap events firing all round. A player mid-jump above the platform still counts. There are no new abilities here. The fight comes from what already existed: drop kick knockback to push people off, and jumping costs stamina.

### 3. Snowball Fight

This is the biggest one, about the size of the other four together, and the most GAS-heavy.

**Snow and throwing**

- Hold R while standing still to gather: +1 snowball every 0.8 s, up to 10. Moving cancels.
- Carrying 5 or more slows you by 6% per snowball from the 5th, down to -36% at 10.
- Hold LMB to charge for up to 1.2 s, release to throw. Speed scales from 800 to 2200 cm/s, and the ball flies in an arc. The local player sees a dotted preview arc.
- The snowball count is a GAS attribute on the PlayerState's ASC.

The throw is server-authoritative. **The server measures the charge time itself** (from activation to the release event) and uses its own copy of the control rotation. The client never sends a speed or direction, only the release. The server spawns and simulates the projectile, and I decided against a predicted cosmetic ball for now.

**Hit zones and status effects**

| Zone | Damage | Status |
|---|---|---|
| Head | 50 | Blur vision |
| Arms | 25 | Attack slow |
| Legs / body | 25 | Move slow |

The server traces the victim's mesh at the impact point and walks the hit bone up the skeleton until it finds an entry in a bone-to-zone table. The result is **cross-checked against the impact height on the capsule**, because the server's pose can be stale, and if they disagree the height wins. One side effect I still have to decide on: an arm raised above head height counts as a head hit.

Each status is an infinite gameplay effect with `AggregateByTarget` stacking, capped at 3 stacks: -15% speed per move-slow stack, +40% charge time and cooldown per attack-slow stack, three blur levels. After 5 seconds without a hit, all statuses clear and health regenerates at 10 HP/s via a periodic effect. A small server-side subsystem tracks those 5-second windows and only ticks when there's something to track.

**Snowmen, revives and lives**

- At 0 HP you become a snowman. You can't move or throw, but the camera still turns.
- A teammate holding E nearby for 5 s revives you with 55 HP. An enemy holding E for 1 s shatters you, and you lose a life.
- A snowman never shatters by itself. It thaws after 15 s with 30 HP. Mashing left/right speeds that up to a 10-second minimum, so being rescued is still better than waiting.
- Lives default to 1. Out of lives means eliminated, and you watch a living teammate.

The snowman mark is a replicated loose tag that the movement component treats like the countdown lock. Mash input goes to the server as an unreliable RPC carrying only a direction (-1 or +1). Anything else is dropped, and holding one key does nothing because only direction *changes* count. Lives are stored on the PlayerState rather than as an attribute, because they have to survive pawn changes and must not be refilled by the reset described above.

**Match rules:** 5 minutes. The team with more survivors wins, and snowmen count as survivors. A tie goes to a 3-minute overtime, and a tie after that is a draw. A team with nobody left loses immediately. Friendly fire is off.

### 4. Tag

The game definition only said "touch to tag", so these rules are first-pass assumptions that the playtest will confirm or overturn. Each one is a config value or a small change.

- Each round one team chases and the other runs. Two 60-second rounds, roles swap.
- A chaser presses LMB to tag every enemy runner within reach in front of them (90 cm reach, 50 cm radius, 0.15 s window, 0.6 s cooldown).
- A tagged runner is **frozen until the round ends**: no movement, no jump, no abilities, and no rescue.
- Chasers get +10% speed.
- **The winner is decided by catch ratio, not round wins**: runners tagged divided by runners, so a 3 vs 2 matchup is fair. If both teams caught everyone, the faster total clear time wins.

How it's built:

- `UTumbleTagAbility` is a **server-only** ability carrying the existing `Abilities.Primary` tag, so the LMB path from DevLog #2 activates it with no input changes. Its `ActivationRequiredTags` is `State.Tag.Chaser`, so runners simply can't activate it.
- For its short window it reuses the melee hit tracker from the [damage post](./2026-10-03-tumble-teams-damage-and-hit-detection). I added a `StepAt` variant that sweeps from an arbitrary point in front of the capsule instead of a foot bone. Damage and knockback are zero.
- Being tagged is an infinite effect granting `State.Tag.Tagged`, which the movement component treats as a lock.
- The chaser speed bonus is applied in the movement component's `GetMaxSpeed` while the replicated chaser tag is present, so the owning client predicts it.
- The Tag pawn grants only the Tag ability, so the kick and drop kick don't exist in this minigame.

One edge case needed a new hook: if a chaser's pawn is restarted mid-round, the normal reset removes the chaser tag. `OnPlayerRestarted` runs after the reset and lets the rules restore the round role.

### 5. Dodgeball

These rules are also first-pass assumptions.

- Two halves of a court. LMB throws a ball instantly, with unlimited balls and a 1-second cooldown.
- Any hit from an enemy ball puts you **out until the round ends**. There's no damage and no hit zones.
- Out players are teleported to their team's bench and can't throw. There's no catching.
- The team with more players left at time-up wins the round, and a team with nobody left loses at once. Best of 3, 90 s rounds.

This is where reuse paid off. `ADodgeballProjectile` subclasses the snowball projectile, and the base class got a few virtual hooks (which victims to hit, what a hit does, the client-side radius, launch parameters). The default implementations are the old snowball code paths, so Snowball Fight is meant to behave exactly as before, and the existing Snowball tests act as the regression guard. Counting players left reuses the Snowball survivor helpers, so there's no new win logic.

The court has an invisible midline and a fence around the benches. Two details there:

- I couldn't use the engine's `InvisibleWallDynamic` collision profile, because it blocks the camera channel and the spring arm would snap in whenever you stood next to the midline. The barrier is a small custom actor that blocks pawns but ignores the camera and visibility channels.
- The barriers use the `WorldDynamic` object type, and the ball ignores `WorldDynamic`. **Players can't cross the midline, but balls fly over it.** Visible walls are `WorldStatic` and still stop balls.

Bench slots are 120 cm apart. If a slot is blocked, the next ones are tried with normal collision checks, and if all fail the player stays where they were hit (still out). I chose that over a forced teleport, because an out player standing on the court is less bad than one stuck inside geometry.

## How GAS is used across the minigames

| | Abilities | Effects / tags | Attributes |
|---|---|---|---|
| Obstacle Course | existing kick, drop kick, dash | countdown lock tag | stamina, health |
| Take The Ground | same | countdown lock tag | stamina, health |
| Snowball Fight | gather, throw, interact | 3 stacking status effects, regen, snowman tag | snow count, health |
| Tag | tag (server-only) | tagged effect, chaser tag, cooldown effect | none new |
| Dodgeball | throw (local predicted) | out effect, cooldown effect | none new |

Snowball Fight, Tag and Dodgeball each have their own pawn Blueprint that grants only that minigame's abilities, while the first two use the normal character. LMB means "kick" in one map, "throw" in another and "tag" in a third, without any branching in the controller.

## Traps along the way

| Symptom | Cause and fix |
|---|---|
| A test would have broken the client build | `GetActorLabel()` is editor-only, and my build check only compiled the editor target. Map tests now find actors by tag, and the build check also compiles the Game target |
| Same category, in effect setup | `SetStackingType` is editor-only. Stacking is set by direct field assignment instead |
| Snowballs went the wrong way | The launch direction was rotated into world space twice. Fixed, with a test |
| A pillar in a generated map went through the floor | Positional `unreal.Rotator(a, b, c)` in editor Python is (roll, pitch, yaw), not (pitch, yaw, roll). Use keyword arguments |
| Dash cooldown could never be raised | The attribute's base clamp capped the new value at the current one, and the same branch also wrote the current mana into mana's base. The cooldown now has a floor of 0 and no cap |
| A future hazard with infinite modifiers | `PostGameplayEffectExecute` copied the current value into the base for health, stamina and snow count, which double-counts once an infinite buff exists. Current values are now clamped in `PreAttributeChange`, and buffs add their delta to the base |

## Where it actually stands

| Minigame | Rules in code | Map | Presentation |
|---|---|---|---|
| Obstacle Course | done | PCG dungeon; team starts computed, not hand-placed | existing |
| Take The Ground | done | greybox | text HUD, round banner |
| Snowball Fight | core done | greybox | text HUD, snowman is a plain white sphere |
| Tag | done (first-pass rules) | greybox | HUD line only, no tag animation, no marker over tagged players |
| Dodgeball | done (first-pass rules) | greybox court | HUD line only |

Still not built:

- **Snowball items** (13 item types in the spec, from buffs to "Chaos Revive")
- **Snowball footprints and snow depletion**. Right now any walkable ground counts as snow.
- **Snowball presentation**: thaw and revive bars instead of text, and spectator view cycling

The project has about 159 automated tests. They cover the pure logic: phase transitions, scoring, catch ratios, survivor counts, stacking caps, thaw timing, and map layout checks. **None of this has been played by real people yet.** The first full four-player playtest of the whole loop (lobby, all five minigames, back to the lobby) is the next step. I haven't produced a packaged build yet either. The dedicated server and AWS still come after the game works.

The questions I most want that playtest to answer:

1. Is Take The Ground fun at 3 vs 3, or does it only work near 5 vs 5?
2. Is a 90 cm tag reach forgiving enough without an animation? Can you tell who's tagged without the HUD?
3. Is +10% chaser speed enough to catch a sprinting runner?
4. Should out players in Dodgeball be able to walk around the bench, or be locked in place?
5. Does a raised-arm snowball hit feel right as a head hit?

## What I took from it

- **Build the loop before the content.** Once the phase machine, the definition asset and the rules interface existed, each later minigame was mostly "write one rules class, one config asset, one map." Tag and Dodgeball, the last two, only needed small additions to the shared code: a restart hook and a way for an ability to reach the active rules.
- **Keep decision logic world-free.** Every win condition is a pure function over plain structs, which is why those ~159 tests can exist without spinning up a server. What the tests can't tell me is whether any of it is fun.
- **A PlayerState-owned ASC needs one cleanup point.** Stacking statuses, freezes, outs and cooldowns all outlive the pawn. Funneling cleanup through `ResetVitals`, plus a single restart hook for rules that need to put state back, kept that manageable.
- **Reuse with hooks, not copies.** The Tag sweep and the Dodgeball ball both came from existing code by adding a small seam, not by forking it.

Next DevLog will be about what breaks when people actually play it.
