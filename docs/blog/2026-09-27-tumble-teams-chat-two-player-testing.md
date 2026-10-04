---
title: "Testing Chat with Two Players"
description: "What a second pass on my UE5 chat plugin turned up: notes that disagreed with the code, a Blueprint chat that never reached other clients, a validation trap, editor Python that can't test RPCs, and the small UI bugs only a real second player reveals."
date: 2026-09-27
outline: deep
---

# Testing Chat with Two Players

When I came back to finish the chat plugin for Tumble Teams, my notes said it was nearly done. Testing it with two real players showed how much of that wasn't true. This post is the list of what I found, roughly in the order I found it.

## My notes described code that didn't exist

The notes listed focus fixes from mid-September (a re-entrancy guard, a function to claim focus for an idle window), but none of those symbols were anywhere in the code. `git log --all -S` found nothing either. `git reflog` did: the work lived in a single commit that belonged to no branch, so `--all` couldn't see it. Right after it, I had checked out an older commit and then switched direction to a Blueprint-based chat UI, and never updated the notes.

Now I grep the code for a symbol before trusting a "done" in my notes, and if `git log --all` can't find it, I check the reflog.

## The Blueprint chat could never reach other players

The Blueprint chat component I'd moved to had `Replicates` set to false, with Server and Client RPC custom events on it. It could never have delivered a message to another client. It also had the client attach its own display name (spoofable), with no length limit and no rate limit.

I kept the Blueprint UI and moved sending into the C++ `UChatComponent`: the server stamps the sender's name, enforces the length limit and rate limit, and validates whisper targets. The display name is capped at 20 characters on the server.

## Validation that kicks honest players

While merging, I noticed the Server RPC was declared `WithValidation`, and `_Validate` returned false for over-length messages and missing whisper targets. In Unreal, a failed `_Validate` is treated as cheating and disconnects the client. That would kick a normal player for pasting a long line, and it made the length check in `_Implementation` unreachable.

I removed validation from the RPC. Every rejection now happens in `_Implementation` and goes back to the sender only. `_Validate` is for requests an honest client could never send, not for ordinary user mistakes.

## "I can only see my own messages" was a bad test

I tested by calling the send function from editor Python in both instances. Each side showed only its own message, and sending from the server-side component reached the host but not the client.

The cause is that editor Python sets `GAllowActorScriptExecutionInEditor`, which makes `AActor::GetFunctionCallspace` return `Local` unconditionally. Every RPC called from Python executes locally, and the net log confirms it with `GetFunctionCallspace ScriptExecutionInEditor`. The same applies to timer callbacks registered from Python.

So **networking can't be verified from editor Python.** It needs real input in a real PIE session. Python is still useful for checking bindings, widget layout, and colors.

(I also tried driving the PIE window with simulated key presses from a shell script. The window never came to the foreground, so the keystrokes landed in my terminal as garbage. Not worth repeating.)

## A build break the editor never showed

Separately, a full build failed with `C2084`: two files in another module each defined the same anonymous-namespace helper, which collides when unity builds merge them into one translation unit. The editor didn't expose it because adaptive unity builds compile recently edited files individually. `-DisableAdaptiveUnity` reproduces it. Renaming the two helpers fixed it, and it needed to be fixed before packaging, which builds in full unity mode.

## Receiver-side UI bugs

| Symptom | Cause | Fix |
|---|---|---|
| Messages invisible until you press Enter | The whole chat box was Hidden or Collapsed, and only focusing it showed it | Show on receive, hide again after 10 seconds if unfocused |
| Chat box disappears while typing | The 10-second hide timer outlived re-entering chat | Clear the timer when focusing |
| "TYPE..." hint visible to someone who never typed | The designer default is the typing look, and only the exit path reset it | Apply the idle look in `Construct` |
| Long message doesn't scroll to the bottom | `ScrollToEnd` runs next tick using the current content height, which isn't final yet after a Collapsed to visible switch | Call it again 0.1 seconds later |
| Long IDs run off-screen | Wrapping only breaks at word boundaries | Per-character wrapping plus the server-side name cap |

## Two Tab bugs

- **Tab didn't switch channels.** I'd typed `(KeyName="Tab")` as a default value for a key-comparison pin. `FKey::ImportTextItem` reads a single token, so it stored `(` and the comparison was always false. Key pin defaults take just the name: `Tab`.
- **After closing chat, Tab drew a black border and cut off game input.** The chat box had `IsFocusable` set to true, so Slate's keyboard navigation (Tab means next) moved focus onto it from the viewport. Setting `IsFocusable` to false fixed it. Input focus is given directly to the text box, and preview key events pass through ancestor widgets whether or not they're focusable.

## Channels, teams, and colors

All reaches everyone, Team reaches only teammates, and System is used for failures. The game's PlayerController implements `IGenericTeamAgentInterface` from its player state's team index, so the chat plugin never depends on game classes. A sender with no team gets "You are not on a team" instead of silently broadcasting to everyone, which is what happened when everyone defaulted to team 0. Each channel has its own color, and the typing prefix and typed text take the active channel's color.

Still open: whisper sending (needs a target-selection UI), the General channel for menus (needs a separate transport, since there's no game server connection in the menu), and verifying Team chat with three or more players on one team. With two players on opposing teams, I could only confirm that Team messages don't reach the enemy.
