---
title: "A Low-Health Heartbeat That Plays but Can't Be Heard in UE5: 98 % of the Energy Below 150 Hz, and How to Meter the Real Output"
description: "A UE5 game's low-health heartbeat was playing at full volume, yet players couldn't hear it: nearly all of the sound sat below 150 Hz, where laptop speakers and headsets roll off and the ear is least sensitive. How I checked it with an output meter on the main submix, why every level read 0 in automated PIE windows, and the fix: harmonics, a mid-band knock layer and louder stage volumes."
date: 2026-11-22
workedOn: 2026-11-20
publishAt: 2026-11-22
track: "Heartbeat not heard"
category: "Debugging / Audio"
sidebar: "Inaudible Heartbeat"
image: /blog/pseudo-heartbeat-c.jpg
outline: deep
tags: [UE5, Audio, Sound Mix, Debugging]
---

# A Low-Health Heartbeat That Plays but Can't Be Heard in UE5: 98 % of the Energy Below 150 Hz, and How to Meter the Real Output

A sound can be active, at the right volume, unmuffled, and still be inaudible. PSEUDO's low-health heartbeat was all of those: 98 % of its energy sat below 150 Hz, and in the band that speakers and headphones actually reproduce it was about 10 dB quieter than a small drone chirp. If you are adding a low-frequency effect (heartbeats, rumbles, sub hits), this post shows how to check what reaches the output, and how I rebuilt the sound so it survives a laptop speaker.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-heartbeat-c.jpg" alt="The heartbeat played, but almost all of it sat below 150 Hz, where speakers give little." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-heartbeat-c-dark.jpg" alt="The heartbeat played, but almost all of it sat below 150 Hz, where speakers give little." loading="lazy">
</figure>

## What the low-health effect is supposed to do

At 25 % health a heartbeat starts at 72 bpm. At 10 % it speeds up to 120 bpm and the rest of the world is muffled by a sound mix that low-passes the SFX, voice and music classes, while the heartbeat's own class stays unfiltered. The heartbeat is a generated wave, `S_Heartbeat`, made by a Python script.

The report was short: at low health, the heartbeat and the muffle can't be heard.

## Three checks before blaming the sound

First, is it playing? A console command that dumps active sounds showed `S_Heartbeat` active at stage 2 with volume 0.700 and at stage 3 with 1.000, its class low-pass at 20000 Hz (not muffled), on each machine's own audio device, on host and client.

Second, is the muffle applied? With a rain loop as a reference, the rain's class low-pass was at 700 Hz and its volume 0.80 at stage 3. In the output, everything above 2 kHz dropped from -22.1 to -39.7 dBFS, 17.6 dB quieter. The muffle worked. It only applies below 10 % health, though, so in normal play a player mostly met the heartbeat alone.

Third, what does the output actually contain? This needed a new tool. I added `pseudo.Audio.Meter`, a listener on the main submix that records the mixed output for a few seconds and reports the RMS level, the loudest 100 ms window, and the level in three bands (below 200 Hz, 200 Hz to 2 kHz, above 2 kHz).

My first meter runs read 0 for everything, -140 dBFS. That was a test artefact, and a trap worth knowing: in the engine's editor tick, a PIE window without focus gets the application volume set to 0 unless background audio is allowed, and only one PIE audio device renders until the "play all PIE audio" toggle is on. Automated PIE windows never have focus.

## A heartbeat made almost entirely of sub-bass

With the meter working, the host's numbers:

| Window | Below 200 Hz | 200 Hz-2 kHz | Above 2 kHz | Loudest 100 ms (above 200 Hz) |
|---|---|---|---|---|
| Full HP, rain reference | -42.3 | -28.3 | -22.1 | -19.8 (-21.0) |
| Stage 2 heartbeat | -29.3 | -38.6 | -57.9 | -21.4 (-31.1) |
| Stage 3 heartbeat | -24.2 | -33.4 | -52.0 | -19.1 (-28.4) |
| Drone hurt chirp (0.70) | -38.3 | -27.5 | -32.5 | -20.8 (-21.9) |

The heartbeat's peak was as loud as the chirp's overall, but almost all of it was below 200 Hz. Above 200 Hz it peaked at -31.1 dBFS, against -21.9 for the chirp. The client matched within 1 dB.

An offline look at the wave file agreed: spectral centroid 75 Hz, 98.3 % of the energy below 150 Hz, A-weighted level -36.8 dB(A)FS against -26.6 for a footstep wave.

The generator built each thump from a sine sweeping from 95 down to 48 Hz and then low-passed everything at 400 Hz. That is where small speakers roll off and where hearing is least sensitive: on equal-loudness curves, 50 to 70 Hz needs about 30 dB more than 1 kHz to sound as loud. Stage 2 also played it at 0.7 volume.

## Rebuilding the thump for small speakers

The timing stayed the same 0.05 s / 0.30 s. Everything else in the generator changed:

- Thumps sweep 110 to 62 Hz and 100 to 66 Hz, with 2nd and 3rd harmonics at 0.8 and 0.5.
- A band-passed noise "knock" at 180 Hz (gain 5) and 420 Hz (gain 3) gives each beat an attack in the mid band.
- The final low-pass moved from 400 Hz to 1.6 kHz.

The new wave has a centroid of 157 Hz, 57 % of its energy below 150 Hz and 40 % between 150 and 500 Hz, and an A-weighted level of -29.2 dB(A)FS, 7.6 dB louder.

Two other changes in settings and the mix:

- Heartbeat volume at stage 2 and 3: 1.0 and 1.4 (was 0.7 and 1.0).
- The muffle mix is stronger: SFX low-pass at 450 Hz and volume 0.6, voice 600 Hz and 0.7, music 800 Hz and 0.8 (was 700 / 0.8, 900 / 0.85, 1200 / 0.9).

## Measured after the change

Final build, listen server and one client, output meter on each machine:

| Window | Host before -> after | Client before -> after |
|---|---|---|
| Stage 2, loudest 100 ms above 200 Hz | -31.1 -> -26.2 dBFS | -31.1 -> -26.4 |
| Stage 3, loudest 100 ms above 200 Hz | -28.4 -> -24.5 | -29.0 -> -23.3 |
| Rain above 2 kHz, full HP -> stage 3 | -22.1 -> -42.1 (was -39.7) | -22.1 -> -42.1 |
| Drone hurt chirp, for comparison | -21.9 -> -27.3 | -21.1 -> -27.8 |

The drone chirp was also lowered by 6 dB in the same audio pass. Against it, the heartbeat went from about 9 dB under to about 1 dB over. The meter's bands are simple one-pole filters, so some sub-bass leaks into the "above 200 Hz" number. The real gain in the audible band is larger: in the wave, 150 to 500 Hz went up 12 dB, plus 3.1 dB of volume. Whether it sounds right is still a listening test, which no meter replaces.

## Checking your own low-frequency sounds

- "It plays" is not "it's heard". Check a new sound's spectrum: where its energy sits and its centroid.
- Meter the real mixed output, not just the sound's volume setting, and compare it with something the player already hears clearly, like a footstep or a UI chirp.
- If your meter reads silence in automated PIE runs, check background audio and which PIE window owns the audio device before you suspect the game.
- Give heartbeats, rumbles and impacts a mid-band layer (harmonics, a transient) so they survive laptop speakers and headsets.
- If an effect depends on a mix that only applies at a lower threshold, test the stage players spend most of their time in on its own.
