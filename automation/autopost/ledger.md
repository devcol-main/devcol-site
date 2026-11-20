# Autopost ledger

Source notes that have already been handled (posted, merged into another post, or skipped on purpose).
The autopost run reads this file to find what's new, and appends one line per source it handles.
Format: `- <repo>: <source path or commit range> -> <post slug | skipped: reason>`

## Cut-off as of 2026-11-04

- PSEUDO: Documents/Debugging/DBG-001 .. DBG-030 -> all handled (posted, merged into a series, or skipped)
- TumbleTeams: Documents/Devlogs/* up to devlog_2026-10-03_DamageAndHitDetection.md -> all posted
- TumbleTeams: commits up to df86fec (2026-10-24, minigame playlist work) -> 2026-10-24-tumble-teams-devlog-03-minigame-playlist

## PSEUDO issue records (Documents/Issues)

Format: `- PSEUDO: Documents/Issues/ISS-NNN <name>.md -> <post slug | skipped: reason>`. Records not listed (e.g. ISS-008, still open) are picked up by a later run.

- PSEUDO: Documents/Issues/ISS-004 Anim Layers.md -> skipped: no general lesson (130-word asset list)
- PSEUDO: Documents/Issues/ISS-005 Face Swap.md -> skipped: covered by the MetaHuman on Paragon series (2026-10-14/15 posts)
- PSEUDO: Documents/Issues/ISS-006 Foot IK.md -> skipped: no general lesson beyond 2026-11-02-pseudo-idle-foot-sink-dash-leg-drag (under 300 words)
- PSEUDO: Documents/Issues/ISS-007 Melee Combo.md -> 2026-11-14-pseudo-melee-combo-graph-build
- PSEUDO: Documents/Issues/ISS-016 Weapon Core.md -> 2026-11-14-pseudo-melee-hit-detection-build (folded)
- PSEUDO: Documents/Issues/ISS-017 Hit Pipeline A.md -> 2026-11-14-pseudo-melee-hit-detection-build
- PSEUDO: Documents/Issues/ISS-018 Stats and Data B1.md -> 2026-11-14-pseudo-data-driven-stats-mmc
- PSEUDO: Documents/Issues/ISS-012 Foot Sinking On Start And Jump.md -> 2026-11-15-pseudo-foot-floor-guard
- PSEUDO: Documents/Issues/ISS-019 AI Core.md -> 2026-11-15-pseudo-enemy-ai-statetree-core
- PSEUDO: Documents/Issues/ISS-021 Weapon Swap.md -> 2026-11-15-pseudo-weapon-swap-auto-stow (folded)
- PSEUDO: Documents/Issues/ISS-022 Non-Combat Mode.md -> 2026-11-15-pseudo-weapon-swap-auto-stow
- PSEUDO: Documents/Issues/ISS-324 Grenade Aim Coat.md -> skipped: covered by 2026-11-15-pseudo-grenade-aim-coat-shoulder
- PSEUDO: Documents/Issues/ISS-544 Sevarog Attack Whiffs.md -> skipped: covered by 2026-11-15-pseudo-boss-swing-whiffs-reach
- PSEUDO: Documents/Issues/ISS-025 Elements and Resistances B2.md -> 2026-11-16-pseudo-elements-resistances-gas
- PSEUDO: Documents/Issues/ISS-026 Progression and Skill Tree.md -> 2026-11-16-pseudo-skill-tree-progression-gas
- PSEUDO: Documents/Issues/ISS-030 Lock-On and Feel.md -> 2026-11-16-pseudo-time-dilation-lock-on-hitstop
- PSEUDO: Documents/Issues/ISS-035 Defense.md -> 2026-11-17-pseudo-server-judged-parry-dodge
- PSEUDO: Documents/Issues/ISS-038 Dice.md -> 2026-11-17-pseudo-dice-roll-ability-gas
- PSEUDO: Documents/Issues/ISS-040 Reactions and Status.md -> 2026-11-17-pseudo-hit-reactions-groggy-break-fall
- PSEUDO: Documents/Issues/ISS-042 AoE.md -> 2026-11-18-pseudo-aoe-attacks-server-validated
- PSEUDO: Documents/Issues/ISS-044 Part Health.md -> 2026-11-18-pseudo-breakable-parts-shield
- PSEUDO: Documents/Issues/ISS-045 Boss Rampage.md -> 2026-11-18-pseudo-boss-phases-statetree
- PSEUDO: Documents/Issues/ISS-049 Ranged Shooting.md -> 2026-11-19-pseudo-hitscan-pistols-server-validated
- PSEUDO: Documents/Issues/ISS-079 Ranged Redesign.md -> 2026-11-19-pseudo-hitscan-pistols-server-validated (later redesign of the same feature, written as one post)
- PSEUDO: Documents/Issues/ISS-052 Game Flow and Interact.md -> 2026-11-19-pseudo-interact-portal-server-travel
- PSEUDO: Documents/Issues/ISS-056 Jump and Landing.md -> 2026-11-19-pseudo-coyote-time-fall-damage-break-fall
- PSEUDO: Documents/Issues/ISS-058 Dice Unlocks.md -> 2026-11-20-pseudo-dice-advantage-reroll-undo
- PSEUDO: Documents/Issues/ISS-060 AI Perception.md -> 2026-11-20-pseudo-ai-perception-awareness-states
- PSEUDO: Documents/Issues/ISS-064 Batch 1 Fixes.md -> skipped: chore (batch fixes; menu input fix already posted as 2026-10-22-pseudo-menu-start-no-control)
- PSEUDO: Documents/Issues/ISS-067 Menu Debug Docs.md -> skipped: chore (debug-doc work, no code change)
- PSEUDO: Documents/Issues/ISS-069 Main Menu Buttons.md -> skipped: no general lesson (short placeholder menu-button pass, later replaced by the UI rework)
- PSEUDO: Documents/Issues/ISS-071 Unlock All Cheat.md -> skipped: chore (cheat)
- PSEUDO: Documents/Issues/ISS-073 Non-Combat Tuning.md -> skipped: chore (tuning-only)
- PSEUDO: Documents/Issues/ISS-075 Level Metrics and Gym.md -> skipped: covered by /wiki/pseudo/systems/level-metrics (gym, method and numbers already there)
- PSEUDO: Documents/Issues/ISS-077 Sprint Tap Hold.md -> 2026-11-20-pseudo-dodge-tap-sprint-hold
- PSEUDO: Documents/Issues/ISS-613 Enemy Ragdoll Launch.md -> skipped: covered by 2026-11-20-pseudo-ragdoll-launch-on-death
- PSEUDO: Documents/Issues/ISS-614 Prime Helix Move-Off Jitter.md -> skipped: covered by 2026-11-20-pseudo-detour-crowd-max-agent-radius-jitter
- PSEUDO: Documents/Issues/ISS-081 Animation Pass.md -> skipped: chore (batch of animation feedback items: montage rate scales, clip swaps, a stowed layer)
- PSEUDO: Documents/Issues/ISS-083 Combat UI.md -> 2026-11-22-pseudo-combat-ui-overhead-boss-bars
- PSEUDO: Documents/Issues/ISS-085 Save Load and Checkpoints.md -> 2026-11-22-pseudo-save-load-checkpoints-listen-server
- PSEUDO: Documents/Issues/ISS-087 Settings UI and Key Remapping.md -> 2026-11-22-pseudo-settings-menu-key-remapping-commonui

## Handled after the cut-off

- PSEUDO: Documents/Debugging/DBG-031 Forward Dash Pose Cuts The Dash And Sinks The Feet (2026-11-05).md -> 2026-11-05-pseudo-dash-pose-blend-out-cuts-dash
- PSEUDO: Documents/Debugging/DBG-032 Remote Shot Starts At A Stale Muzzle (2026-11-05).md -> 2026-11-05-pseudo-remote-shot-stale-muzzle
- PSEUDO: Documents/Debugging/DBG-033 Distortion Effects Draw Nothing (2026-11-05).md -> 2026-11-05-pseudo-distortion-effects-draw-nothing
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-05) -> nothing to post
- PSEUDO: Documents/Debugging/DBG-034 Dash Distortion Cuts The Body In Half (2026-11-05).md -> 2026-11-05-pseudo-dash-distortion-cuts-body
- PSEUDO: Documents/Debugging/DBG-035 Burn Status Never Activates And Crashes The Editor (2026-11-05).md -> 2026-11-05-pseudo-burn-status-recursion-crash
- PSEUDO: Documents/Debugging/DBG-036 Pack Distortion Pair Cuts The Body From The Front (2026-11-05).md -> 2026-11-05-pseudo-sword-distortion-cuts-body-front
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-06) -> nothing to post
- PSEUDO: Documents/Debugging/DBG-037 Buff Enemies Cannot Be Hit Without A Physics Asset (2026-11-06).md -> 2026-11-06-pseudo-buff-enemies-no-physics-asset
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-07) -> nothing to post
- PSEUDO: Documents/Debugging/DBG-038 Grenade Aim Tears The Coat Shoulder And Fades The Body (2026-11-07).md -> 2026-11-15-pseudo-grenade-aim-coat-shoulder (fixed 2026-11-14)
- PSEUDO: Documents/Debugging/DBG-039 Status Look Missing On Client When Status Already Running (2026-11-07).md -> 2026-11-07-pseudo-status-look-missing-on-client
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-08) -> nothing to post
- PSEUDO: Documents/Debugging/DBG-038 still Open (checked 2026-11-13) -> stays PENDING (posted 2026-11-14 run, see above)
- PSEUDO: Documents/Debugging/DBG-040 Portal View Hitch (2026-11-12).md -> 2026-11-12-pseudo-gc-hitch-at-61-seconds
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-13) -> nothing to post
- PSEUDO: Documents/Debugging/DBG-041 Sevarog Attacks Whiff (2026-11-14).md -> 2026-11-15-pseudo-boss-swing-whiffs-reach
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-14) -> nothing to post
- PSEUDO: no new Debugging notes after DBG-041 (checked 2026-11-15); ISS-008 still open, left for a later run
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-15) -> nothing to post
- PSEUDO: no new Debugging notes after DBG-041 (checked 2026-11-16); ISS-008 still open, left for a later run
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-16) -> nothing to post
- PSEUDO: no new Debugging notes after DBG-041 (checked 2026-11-17); ISS-008 still open, left for a later run
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-17) -> nothing to post
- PSEUDO: no new Debugging notes after DBG-041 (checked 2026-11-18); ISS-008 still open, left for a later run
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-18) -> nothing to post
- PSEUDO: Documents/Debugging/DBG-042 Enemy Ragdoll Launches On Death (2026-11-18).md -> 2026-11-20-pseudo-ragdoll-launch-on-death
- PSEUDO: Documents/Debugging/DBG-043 Prime Helix Move-Off Jitter (2026-11-18).md -> 2026-11-20-pseudo-detour-crowd-max-agent-radius-jitter
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-19) -> nothing to post
- PSEUDO: Documents/Debugging/DBG-044 Enemy Melee Starts Out Of Reach (2026-11-20).md -> updated 2026-11-15-pseudo-boss-swing-whiffs-reach
- PSEUDO: Documents/Debugging/DBG-045 Corpse Jumps Seconds After Ragdoll (2026-11-20).md -> 2026-11-22-pseudo-ragdoll-corpse-jumps-climbs-slope
- PSEUDO: Documents/Debugging/DBG-046 Corpse Climbs Up A Slope (2026-11-20).md -> 2026-11-22-pseudo-ragdoll-corpse-jumps-climbs-slope
- PSEUDO: Documents/Debugging/DBG-047 Enemy Walk Hitches And Leg Pops (2026-11-20).md -> 2026-11-22-pseudo-ai-stopmovement-velocity-reset-hitch
- PSEUDO: Documents/Debugging/DBG-048 Dead Player Stands Up After The Death Clip (2026-11-20).md -> 2026-11-22-pseudo-death-montage-stands-up-touching-segments
- PSEUDO: Documents/Debugging/DBG-049 Heartbeat Not Heard (2026-11-20).md -> 2026-11-22-pseudo-low-health-heartbeat-not-heard
- PSEUDO: Documents/Debugging/DBG-050 Rear Hit Lights The Top Edge (2026-11-21).md -> 2026-11-22-pseudo-hit-direction-indicator-camera-pitch
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-21) -> nothing to post

## Wiki follow-ups


## Screenshots wanted

- 2026-11-22-pseudo-hit-direction-indicator-camera-pitch: the hit edge at the bottom for a back hit with the camera pitched down and the attacker below (after the fix).
- 2026-11-22-pseudo-combat-ui-overhead-boss-bars: the boss bar at the top and an elite overhead bar in the same frame.

## Maintenance log

- 2026-11-13: wiki follow-up done: /wiki/pseudo/systems/defense "Status" now says the forward dash holds a single sprint pose and only back/left/right use borrowed evade clips (DBG-031).
- 2026-11-14: wiki follow-up done: /wiki/pseudo/systems/camera now describes the 70 / 30 cm dither fade of the local character (was a hard hide under 50 cm, fade listed as open) (DBG-038).
- 2026-11-15: wiki follow-up done: /wiki/pseudo/systems/weapons "Status" now says auto stow and the draw attack are in the build (was: on an unmerged branch) (ISS-022). Also, with today's posts, corrected the status lines of /wiki/pseudo/systems/skill-tree (was "designed but not built yet") and /wiki/pseudo/systems/stats-and-level (XP, levels and SP were listed as future work) from ISS-026.
- 2026-11-16: linked today's posts in: /wiki/pseudo/systems/defense (timing section -> parry/dodge build log, break-fall section -> reactions build log) and /wiki/pseudo/systems/dice (Under the hood -> dice build log).
- 2026-11-17: linked today's posts in: /wiki/pseudo/systems/combo-and-cancels (Area attacks -> AoE build log), /wiki/pseudo/systems/enemy-ai (data phases -> boss build log; also fixed the phase tag name from `Boss.Phase.N` to `State.Phase.N`, per ISS-045 and the source), /wiki/pseudo/systems/rampage (Related pages -> parts and boss build logs).
- 2026-11-18: linked today's posts in: /wiki/pseudo/systems/weapons (Ranged mode -> hitscan build log), /wiki/pseudo/systems/controls (L2 interact paragraph -> interaction and travel build log), /wiki/pseudo/systems/level-metrics (Edges and coyote time -> jump and landing build log).
- 2026-11-19: linked today's posts in and corrected status lines: /wiki/pseudo/systems/controls (tap / hold section -> dodge and sprint build log), /wiki/pseudo/systems/dice (Status: Advantage and Re-Roll nodes now exist, per ISS-058; link to the re-roll build log), /wiki/pseudo/systems/enemy-ai (Suspicious now leaves to Return, and perception / search / return home are built, per ISS-060; link to the perception build log).
- 2026-11-21: linked today's posts in and corrected a status line: /wiki/pseudo/systems/controls (the tap/hold threshold is now a per-player setting, per ISS-087; link to the settings and remapping build log), 2026-11-20-pseudo-ragdoll-launch-on-death (Related line to the later corpse post). Also added an Update section to 2026-11-15-pseudo-boss-swing-whiffs-reach from DBG-044.
