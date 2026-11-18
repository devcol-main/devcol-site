---
title: "Server-Checked Interaction and Listen-Server Travel in UE5: an Interactable Interface, a Local Focus Component and ServerTravel From a Portal"
description: "How I built interaction and the game loop for a UE5 listen-server game: an interface plus a component that picks a focus target locally every frame and lets the server re-check it, a portal that calls ServerTravel with ?listen, single player as a one-player listen server, and a boss death that shows the ending on every player through client RPCs."
date: 2026-11-19
workedOn: 2026-10-21
publishAt: 2026-11-19
track: "Game Flow"
category: "Build Logs"
sidebar: "Interaction and Travel"
image: /blog/pseudo-interact-c.jpg
outline: deep
tags: [UE5, Multiplayer, Networking, UI, C++]
---

# Server-Checked Interaction and Listen-Server Travel in UE5: an Interactable Interface, a Local Focus Component and ServerTravel From a Portal

Here is how PSEUDO goes from the main menu to a hub, through a portal into a stage, and from a defeated boss to an ending and back to the menu, with a host and a client the whole way. The interaction part is a pattern you can reuse: **the client chooses what's in focus, the server decides whether the press counts**, and both use the same blocking function so the prompt and the server never disagree.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-interact-c.jpg" alt="The client picks the focused actor every frame; the server re-checks distance and nearby enemies with the same function." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-interact-c-dark.jpg" alt="The client picks the focused actor every frame; the server re-checks distance and nearby enemies with the same function." loading="lazy">
</figure>

## An interface for things, a component for the player

Anything you can use implements one interface. It has four functions: the prompt text, `Interact` (runs on the server), `CanInteract`, and `AllowsInteractInCombat`. The portal is the first one. Pickups, doors and NPCs will implement the same interface later.

The player has an interaction component, and it does two different jobs:

- **Locally, every frame**, it picks the nearest interactable in front of the player within 250 cm and shows its prompt (`[F] Enter Stage 1`). Nothing goes over the network for this.
- **On the F press** it sends the focused actor to the server. The server re-checks three things: the distance (with 100 cm of slack for movement lag), `CanInteract`, and whether a living enemy is within 1000 cm, unless the target allows interaction during combat.

The enemy check lives in a single function, `GetBlocker`. The focus code calls it to hide the prompt, and the server calls it to reject the press. If those were two separate checks, a player could see a prompt the server would refuse, or see none when the server would have accepted. In testing, a portal about 150 cm from a living training dummy showed no prompt. Once the enemies were dead, it showed again.

## Who owns the flow

I kept the flow out of the GameInstance and put it in two game modes:

- A **menu game mode** for the main menu map, with no pawn and its own player controller.
- The **game mode base** for the hub and every stage. It handles travel, the boss's defeat, the ending choice and the return to the menu.

The game mode exists only on the server, which is the one place that should decide when everyone moves. The client side is a set of client RPCs on the player controller (show the ending, show the credits) and server RPCs for the player's answers.

## Single player is a listen server with one player

The main menu's Start button opens the hub with `?listen`. Single player is a listen server with one player. That means every rule written for multiplayer (server checks, prediction, travel) also runs in single player, and there is no second code path to keep in sync.

The portal calls `ServerTravel <map>?listen`. It's non-seamless, and connected clients follow the host. The map names (main menu, hub) live in project settings. The packaged build starts on the main menu map, while the editor's startup map stays on the prototype level I work in. Epic's [Travelling in Multiplayer](https://dev.epicgames.com/documentation/en-us/unreal-engine/travelling-in-multiplayer-in-unreal-engine) page explains seamless and non-seamless travel, if you need to choose between them.

In testing, an interact near the portal logged `session travels to /Game/Maps/L_ProtoTypeMap?listen`, and afterward the host and the client were both on that map with two pawns each.

### The PIE prefix in a travel URL

One problem only shows up in the editor. When the session had been started from the menu in Play In Editor, the travel path contained the PIE world prefix (`UEDPIE_0_`). It still worked, but a path built from a world name in PIE isn't the path a packaged build uses. I now strip the prefix before traveling. If you build travel URLs from `GetWorld()` names, check them in a PIE log.

## Boss death to ending to menu

Enemy data has a flag, `bEndsStageOnDeath`. It's set on the stage boss. When an enemy with the flag dies (the server sees its dead tag change), the game mode sends every player a client RPC to show the ending. The ending asks one question with two answers, and neither one is the right one. The choice comes back to the server, which shows the credits on every player. After the credits, the server travels back to the main menu.

A real kill of the boss showed the ending, with the mouse cursor, on both host and client. Picking an answer switched the host to the credits. I couldn't confirm the client's switch with scripted input: when editor scripting runs a cheat, client RPCs execute on the server. That one had to be checked by clicking the button on a client by hand.

Returning to the menu ends the session. The client loses its host and falls back to its own main menu. That's acceptable for now, but a real game will want to tell the client why.

## Placeholder UI that doesn't spam warnings

The main menu, the ending, the credits and the interaction prompt are built in C++ from plain UMG widgets: a title, a text block and buttons. I'll replace them once CommonUI is set up. Opening them with an input mode of UI only logged `InputMode:UIOnly - Attempting to focus Non-Focusable widget` every time, until the flow widgets were marked focusable. If a widget opened that way logs this warning, the input mode is trying to focus a widget that can't take focus.

One more issue from the map setup: the portal placed in the hub showed no mesh, even though a newly spawned one did. The instance in the level had kept an empty mesh, and setting it on the placed instance fixed it.

## Reusing the interaction pattern

- Do the focus search locally and send only the chosen actor. The server re-checks it, so the client's choice is a request, not a decision.
- Put every "can't use this now" rule in one function that both the prompt and the server call.
- Give distance checks some slack. The server sees the player a little behind where the client does.
- If single player is a one-player listen server, your multiplayer checks get exercised every time you play alone.
- In PIE, log your travel URLs and look for the PIE prefix.

## Not built yet

The gamepad rule is still missing: L2 should interact when something is in focus and swap weapons otherwise (the [controls page](/wiki/pseudo/systems/controls) describes it). Real UI with fades, a dressed hub, credits content, ending variants and a save before the ending are still to come.
