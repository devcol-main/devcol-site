# Autopost ledger

Source notes that have already been handled (posted, merged into another post, or skipped on purpose).
The autopost run reads this file to find what's new, and appends one line per source it handles.
Format: `- <repo>: <source path or commit range> -> <post slug | skipped: reason>`

## Cut-off as of 2026-11-04

- PSEUDO: Documents/Debugging/DBG-001 .. DBG-030 -> all handled (posted, merged into a series, or skipped)
- TumbleTeams: Documents/Devlogs/* up to devlog_2026-10-03_DamageAndHitDetection.md -> all posted
- TumbleTeams: commits up to df86fec (2026-10-24, minigame playlist work) -> 2026-10-24-tumble-teams-devlog-03-minigame-playlist

## PSEUDO issue records (Documents/Issues)

None handled yet. Start from the lowest number. Format: `- PSEUDO: Documents/Issues/ISS-NNN <name>.md -> <post slug | skipped: reason>`

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
- PSEUDO: Documents/Debugging/DBG-038 Grenade Aim Tears The Coat Shoulder And Fades The Body (2026-11-07).md -> PENDING, not done: status Open (clip fix not saved yet); re-check every run and post once it is resolved
- PSEUDO: Documents/Debugging/DBG-039 Status Look Missing On Client When Status Already Running (2026-11-07).md -> 2026-11-07-pseudo-status-look-missing-on-client
- TumbleTeams: no new Devlogs and no commits after df86fec (checked 2026-11-08) -> nothing to post

## Wiki follow-ups

- /wiki/systems/defense: "Where it stands" says the dash uses borrowed evade animations; the forward dash now holds a one-frame sprint pose (TB_Dash_Pose), only back/left/right use evade clips (DBG-031).

## Screenshots wanted

## Maintenance log
