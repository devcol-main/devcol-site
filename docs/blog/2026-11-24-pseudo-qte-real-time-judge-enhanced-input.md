---
title: "Quick-Time Events in UE5 Under Slow Motion: Judge on GetRealTimeSeconds, a Remappable Enhanced Input Context and a Single-Player-Only Rule"
description: "How I built timing-ring and button-mash QTEs for a UE5 action game: windows measured with UWorld::GetRealTimeSeconds so slow motion does not stretch them, a dedicated Enhanced Input mapping context that consumes the key and shows the player's remapped key name, cleanup deferred out of the input callback, Level Sequence hooks through markers instead of a C++ dependency, and a rule that skips the QTE (as a success) in multiplayer."
date: 2026-11-24
workedOn: 2026-10-23
publishAt: 2026-11-24
track: "QTE system"
category: "Build Logs"
sidebar: "Quick-Time Events"
image: /blog/pseudo-qte-judge-c.jpg
outline: deep
tags: [UE5, Enhanced Input, Time Dilation, UI, Level Sequence]
---

# Quick-Time Events in UE5 Under Slow Motion: Judge on GetRealTimeSeconds, a Remappable Enhanced Input Context and a Single-Player-Only Rule

PSEUDO needed quick-time events for cinematic moments: a ring that closes in where you press at the right moment, and a bar you fill by mashing a button. Both play while the scene slows down. This build log covers the parts that carry over to any UE5 project. The most important one: judge every press in real time (`UWorld::GetRealTimeSeconds`), not game time, because time dilation would otherwise stretch your timing windows by one over the dilation. The rest covers how the QTE key stays remappable and does not trigger a jump at the same time, how a cutscene reacts to the result without C++ knowing about sequences, and why I made the whole feature single-player only.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-qte-judge-c.jpg" alt="Presses are judged in real time, so the slow motion around a QTE never widens the windows." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-qte-judge-c-dark.jpg" alt="Presses are judged in real time, so the slow motion around a QTE never widens the windows." loading="lazy">
</figure>

## Two kinds of QTE, described entirely by a data asset

Every QTE is a primary data asset (`UPseudoQTEData`) that holds:

- the kind: **Ring** (one timed press) or **Mash** (a number of presses before a deadline),
- the prompt text, the input action and its mapping context,
- a time limit, and for a ring the target time with a Perfect and a Good window, or for a mash the press count and the time to beat for Perfect,
- how much to slow the world down and which camera mode to use,
- montages for Perfect, success and failure,
- the Level Sequence marker names to jump to on success and on failure.

A component on the player character (`UPseudoQTEComponent`) runs one at a time. `StartQTE(Definition)` is Blueprint-callable, so anything can start one: a trigger volume in the level, an anim notify in a montage, a Level Sequence event or a console cheat. It reports back through four delegates: started, succeeded, failed and finished. The finished delegate carries the result and the sequence marker.

Making a new QTE means duplicating `DA_QTE_Ring` or `DA_QTE_Mash` and changing numbers. The cheat finds new assets by name without any code change.

## Judging presses in real time while the world runs at 0.25

During a ring QTE the world runs at 0.25 speed, and during a mash at 0.4. The slow motion is a request on the game's shared time dilation subsystem (the same one behind the dodge slow-down, described in the [time dilation build log](./2026-11-16-pseudo-time-dilation-lock-on-hitstop)), and the request is removed before the result montage plays, so the montage runs at normal speed.

If the judge used game time, a ±0.25 s Good window at 0.25 dilation would become a full second of wall-clock time. So every time in the QTE is real time from `UWorld::GetRealTimeSeconds`. A press is judged at the real time of the frame its input arrived in. That is at most one frame off, which is far below the windows.

The rules are short:

| Kind | Perfect | Good | Fail |
|---|---|---|---|
| Ring | press within ±0.08 s of the target (1.2 s) | within ±0.25 s | any other press, at once; or no press by 2.0 s |
| Mash | 8 presses by 1.5 s | 8 presses by 3.0 s | fewer than 8 by 3.0 s |

A ring takes exactly one press. An early press fails immediately instead of being ignored, so spamming the button does not work.

The tests ran in the editor with presses injected at chosen real-time offsets while the world was slowed. On the ring, a press at +0.032 s from the target was Perfect, +0.207 s was Good, and a press 0.594 s early failed on the spot. With no press, the QTE timed out at 2.002 s and failed. On the mash, eight presses 0.1 s apart finished at 0.923 s (Perfect), eight presses 0.3 s apart finished at 2.326 s (Good), and four presses timed out at 3.013 s (Fail). The windows held even though the world was running at a quarter speed.

## A dedicated input context that consumes the key

The QTE has its own input action and its own mapping context ([Enhanced Input](https://dev.epicgames.com/documentation/en-us/unreal-engine/enhanced-input-in-unreal-engine)): `IA_QTE` in `IMC_QTE`, Space and pad A by default. The context is added only while a QTE runs, at priority 100, and the action is bound on `Started`. Three details made it behave:

- **The action consumes its keys.** Space is also jump. Because the QTE context is on top and its action consumes the input, pressing Space during a QTE does not make the character jump. In the test the character stayed on the ground after a Space press.
- **A key held at the start is ignored until released.** The context is added with `bIgnoreAllPressedKeysUntilRelease`, so a Space press that was already held when the QTE began does not count as an instant (and probably wrong) press.
- **It is remappable like every other action.** The mapping has a player-mappable name and `IMC_QTE` is in the project's list of remappable contexts, so it shows up as a row in the controls menu (the remapping screen is in the [settings build log](./2026-11-22-pseudo-settings-menu-key-remapping-commonui)). The context is added with `bNotifyUserSettings` and `bForceImmediately` so the player's saved mapping applies right away.

The prompt has to show the key that actually works now, not the default. The widget asks the Enhanced Input subsystem with `QueryKeysMappedToAction(IA_QTE)`, which returns the applied mappings, remaps included, and picks the gamepad key when CommonInput says the current input type is a gamepad. In the test, remapping the QTE key from Space to K changed the prompt to `[K]`. Pressing Space at the right moment then did nothing (and Space jumped normally), and K was judged Perfect. Switching back to Space restored the old behaviour.

### Do not unregister input inside its own callback

The result is decided inside the input binding's callback, so the function that finishes the QTE is running inside that callback. I did not unbind and remove the context there. The cleanup runs on the next tick instead. The removal also does not notify the user settings: if it did, unregistering the context would drop its rows from the player's key profile, and the QTE row would vanish from the controls menu. If you add and remove contexts on the fly, move the removal out of the callback and decide on purpose whether the user settings should hear about it.

## The camera, montages and cutscene hooks

The camera uses the camera mode system the game already had: the QTE pushes an override, `DA_CameraMode_QTE`, a close-up copied from the dice all-in shot (arm 260, FOV 55, 0.2 s blend). When the QTE ends, the previous override, for example the 2D side camera from the [side-scroll section](./2026-11-23-pseudo-2d-side-scroll-plane-constraint), is restored, but only if nothing else replaced the QTE camera in the meantime. That check stops a QTE from undoing a camera change that happened during it.

For now the montages are reused clips: a dodge on ring success, a stagger on ring failure, a draw attack on mash success and a hit reaction on mash failure. Perfect can get its own montage later. They are played with `ACharacter::PlayAnimMontage`, which is enough because the QTE only runs on one machine (next section).

Cutscenes react through markers. The data asset holds the names of a success and a failure marker, and the finished delegate passes the right one. The Level Sequence's Blueprint binds to the delegate and calls **Jump to Marked Frame**. That keeps the `LevelSequence` module out of the game module's C++ dependencies.

The anim notify class that starts a QTE is abstract. Each placed notify is a small Blueprint child with its `Definition` already set (`AN_PseudoQTE_Ring`). In this project, placed instances of an abstract notify class were not saved, so a Blueprint child is the way to place one.

The widget is a plain `UUserWidget` built in code (ring, target circle, Good band, mash bar, real-time bar, key name, result word). It is hit-test invisible and never takes focus. A CommonUI activatable screen would have switched the game to menu input mode, and the game has to keep receiving the QTE key.

## Why QTEs only run in single player

PSEUDO always runs as a listen server, even solo. A QTE in co-op would need the client to judge its own timing and the server to check it. I did not want to build that for a cinematic feature, so the rule is simple. A QTE runs only when the pawn is both the authority and locally controlled (the solo player or the listen host), the session has at most one player, and the game mode allows QTEs (`bAllowQTE`, turned off in the arena mode). The check is repeated every tick, so a player joining mid-QTE ends it.

When a QTE cannot run, it is **skipped**, and a skip counts as success: no montage, and the success marker is passed on. A cutscene or a rail section must never block or punish players in a mode where the QTE cannot appear. On a single machine everything is local and authoritative, so nothing needs replication or prediction.

The multiplayer tests confirmed it. With a host and one client, the host's QTE was skipped because the session had two players, the client's was skipped because it was not the authority, and walking into the trigger skipped too. There was no slow motion and no widget. In the arena game mode with one player, the cheat and the trigger both logged that the game mode does not allow QTEs.

## What is still open

- No QTE is placed in a real montage or sequence yet. That waits for the cinematic and motorcycle sections.
- Movement and other abilities are not blocked during a QTE. Only the QTE key is consumed.
- The gamepad key display depends on CommonInput's current input type and has not been tried with a pad.
- The look (ring sizes, colours, the close-up and the amount of slow motion) still needs a pass by eye.
- Co-op QTEs would need the client judge with server-checked timing mentioned above.

## Checklist for your own QTEs

- Measure every window with `GetRealTimeSeconds` (or another undilated clock) if anything can slow the world during the QTE.
- Give the QTE its own mapping context at a high priority, consume the keys, and ignore keys already held when it starts.
- Show the key from the applied mappings (`QueryKeysMappedToAction`), not from the default asset.
- Remove the context on the next tick, not inside the callback that ended the QTE.
- Let sequences react through marker names in a delegate, so gameplay code does not depend on the sequencer.
- Decide what a QTE does when it cannot run, and make that path count as a success.
