---
title: "Tumble Teams"
description: "Overview of Tumble Teams, a one-month Unreal Engine 5 multiplayer warm-up project: what it is, why I'm building it, how the code is organized, and where every devlog and debugging note lives."
outline: deep
---

# Tumble Teams

Tumble Teams is a small team-based party game I'm building in Unreal Engine 5 with C++: short, chaotic minigames for four to six players split into two teams, with a plain lobby, minigame, results loop and no board-game layer on top.

It's a one-month warm-up with a narrow purpose. I haven't shipped a multiplayer game before, so this project is a low-stakes place to run into replication, the Gameplay Ability System (GAS), Epic Online Services (EOS), and dedicated-server deployment on AWS before I commit to anything bigger. Finishing it, with code I actually understand, matters more than content.

## The minigames

1. **Team obstacle race.** Movement replication, a third-person camera, and finish-line detection. Deliberately built without GAS to keep it simple.
2. **Team tag (cops and robbers).** A close-range touch check that synchronizes state. Built on GAS: tagging is a gameplay ability, and being tagged is a gameplay tag plus a gameplay effect.
3. **Team dodgeball.** Projectile spawning and hit detection, built on GAS with a cooldown ability for the throw.

Stretch goals, only if time allows: a physics chain between two players, and active ragdoll.

## How the code is organized

Anything that isn't specific to this game's rules is built as an independent plugin, so it can be copied into the next project as a folder. A piece of code earns plugin status only if all three of these are true:

1. It knows nothing about the game's rules.
2. I'm sure I'll reuse it, not just that I might need it.
3. Its boundary fits in one sentence.

Team assignment, minigame win conditions, and similar rules stay in the project. There are guardrails against over-abstracting, because "plugin-first" is only one step away from premature abstraction: no features added just because a plugin could be general; no spending more time on generality than on the game; interfaces get extracted at the second use, not the first; and test assets inside a plugin's Content folder are excluded from packaging.

Plugins never depend on each other. `ChatCore` (text chat) and a planned `OnlineFramework` (EOS login, sessions, lobby flow) each talk only to the engine's online subsystem. When they need to cooperate, the project layer wires them together with delegates. For example, "player joined" system messages flow from the session layer to the chat layer through project code, and chat gets team information through an interface the project implements, so it never learns how teams are assigned.

I read Epic's Lyra sample for reference and don't build on top of it. I rebuild only the patterns this game needs, and I keep a design only if I can explain why it's there.

## Reading order

**Devlogs**

- [Devlog #1: Building a Server-Authoritative Chat Plugin in UE5](./2026-08-11-tumble-teams-devlog-01-chatcore)
- [Devlog #2: Data-Driven Input and Preparing for GAS in UE5](./2026-10-03-tumble-teams-devlog-02-input-and-pawn-init)

**Debugging notes and write-ups** (in order of when they happened)

- [Why Only the Listen-Server Host Couldn't Move](./2026-09-18-tumble-teams-listen-server-host-cant-move)

## Where it stands

Working: the chat plugin, data-driven input and pawn initialization groundwork, GAS-based stamina and health with server-side validation, melee abilities with server-authoritative hit detection, and a replicated character appearance system.

Still ahead: replication practice drills, EOS session create and join, and the AWS dedicated-server deployment spike, which is the biggest unknown in the project and has been pushed back more than once.

## Testing multiplayer in the editor

The setup I use for quick two-player tests, under `Edit > Editor Preferences` and the Play options:

- **Allow Late Joining** adds an "Add another client" button for joining extra clients mid-session.
- **Always on Top** keeps the new client windows in front.
- **Launch Separate Server** runs a dedicated server process. Without it, the editor window is both client and server.
- **Run Under One Process** puts everything in one process. That's faster and makes logging easy, but assets are shared between instances, so it isn't a faithful multiplayer environment. Uncheck it to give the server and each client their own processes.
- **Net Mode** set to *Play as Client*, with **Number of Players** set to 2 from the dots next to the Play button.

Several bugs in the notes above only appear in one of those two modes, which is why I keep both around.

## Credits

- Characters: [Creative Characters FREE](https://www.fab.com/listings/94fd60a2-5659-4fc4-af1d-a8cdd2681c2e) by ithappy, with a few extra icons added following a UECore tutorial.
- Loading screen: Async Loading Screen plugin by Truong Bui ([Fab](https://fab.com/s/7741aaefc33a)).
- Font: Paperlogy. The engine only recognizes it if it's imported through the editor and not just copied into a folder.
