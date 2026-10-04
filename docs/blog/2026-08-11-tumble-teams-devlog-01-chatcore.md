---
title: "Tumble Teams Devlog #1: Building a Server-Authoritative Chat Plugin in UE5"
description: "How I built ChatCore, a reusable text chat plugin for Unreal Engine 5 using EOS for identity and replicated RPCs for delivery. Design decisions, the bugs I hit, and what was still left."
date: 2026-08-11
outline: deep
---

# Tumble Teams Devlog #1: Building a Server-Authoritative Chat Plugin in UE5

::: info Update (September 27)
This post describes ChatCore as it stood on August 11. A few things have moved since: the rate limit and history cap listed as "still open" below were finished shortly after; team routing is now wired up through an interface the project layer implements; and in late September I replaced the C++ chat widget with a Blueprint UI on top of the C++ transport layer. The tunneling trick for Enter and Tab now lives in that Blueprint widget. Whisper sending from the UI is still deferred until there's a target-selection UI. The story of that restructure is in [Testing Chat with Two Players](./2026-09-27-tumble-teams-chat-two-player-testing).
:::

Tumble Teams is a small team-based party game I'm building in Unreal Engine 5 (C++): short, chaotic minigames for 4 to 6 players split into two teams. It's a one-month warm-up project. I have never shipped a multiplayer game, and I want to learn replication, the Gameplay Ability System (GAS), Epic Online Services (EOS), and dedicated server deployment on something small *before* I commit to anything bigger.

So the priority here is to finish, with code I understand, and content comes second.

This first devlog covers the first real system I built: **ChatCore**, a text chat plugin. It also covers the less comfortable part: building it meant I started the project out of order.

## Why a chat system first?

My original week-one plan was: replication basics → EOS session create/join → an AWS infrastructure spike (get one dedicated server running on EC2). Chat wasn't on it.

I started with chat anyway, and I logged that as a deviation from the plan. The honest reasoning was mixed:

- Chat touches most of what I'd need later in a small package: creating a plugin, module dependencies in `Build.cs`, Server and Client RPCs, ownership, and a C++ base class for UMG widgets.
- On the other side: it also let me postpone the AWS spike, which is the single most uncertain item in the whole project. Doing the comfortable thing first is a classic way to make a schedule slip.

I'm writing that down publicly because it's the most useful thing I learned in week one. More on that at the end.

## The design in one sentence

> ChatCore uses EOS only to find out *who* a player is, and uses the existing replication connection to deliver messages.

That one sentence drove most of the other decisions.

### Plugin, not a project module

ChatCore lives in `Plugins/ChatCore/` as a standalone plugin rather than a module inside the game. The goal is portability: the same chat should drop into my next project by copying a folder. I use a simple test to decide whether something deserves to be a plugin:

1. It knows nothing about the game's rules.
2. I'm sure I'll reuse it.
3. I can describe it in one sentence.

Chat passes all three. Team assignment doesn't, because it's a game rule, and that matters later.

The `.uplugin` declares `OnlineSubsystem` and `OnlineSubsystemEOS` as plugin dependencies, so a project that enables ChatCore also gets what it needs.

### EOS for identity, RPCs for transport

EOS offers P2P sockets, and it's tempting to use them for chat. But the players are already connected to the same server through Unreal's normal replication. Opening a second network channel just for text would add complexity without solving any problem I actually have.

So the flow is:

1. On the owning client, `UChatComponent` (attached to the PlayerController) asks EOS's `IOnlineIdentity` for the player's display name.
2. That name is registered on the server and cached there.
3. Sending a message is a **Server RPC**; the server validates it, decides who should receive it, and forwards it with **Client RPCs**.

Because the server is the one stamping the sender's name, a client can't simply claim to be someone else.

### Message types

The data is intentionally small. A simplified version:

```cpp
UENUM(BlueprintType)
enum class EChatChannel : uint8
{
    All,
    Team,
    Whisper
};

USTRUCT(BlueprintType)
struct FChatMessage
{
    GENERATED_BODY()

    UPROPERTY(BlueprintReadOnly)
    EChatChannel Channel = EChatChannel::All;

    UPROPERTY(BlueprintReadOnly)
    FString SenderName;

    UPROPERTY(BlueprintReadOnly)
    FString Text;

    // Used by the server to route whispers. Never trusted for display.
    UPROPERTY()
    FUniqueNetIdRepl TargetUniqueId;

    // Used by the UI only. Never trusted for routing.
    UPROPERTY(BlueprintReadOnly)
    FString TargetDisplayName;
};
```

The two whisper fields look redundant, but they solve different problems. Display names aren't unique and can be spoofed, so routing a whisper by name could deliver it to the wrong person. The unique net ID is what the server routes on; the display name is just what the UI shows.

### Where validation lives (and why not `_Validate`)

Unreal lets you add a `_Validate` function to a Server RPC. If it returns false, the engine treats the call as a cheating attempt and **disconnects the client**.

That's the right response to a forged packet, but the wrong response to a player who pasted a paragraph that's too long. So content checks live in `_Implementation`, and failures go back only to the sender:

```cpp
void UChatComponent::ServerSendChatMessage_Implementation(const FChatMessage& Message)
{
    if (Message.Text.Len() > MaxMessageLength)
    {
        // Only the sender hears about this. Nobody gets kicked.
        ClientChatSendFailed(EChatSendError::TooLong);
        return;
    }

    // ... resolve sender name on the server, route by channel,
    //     forward to recipients via Client RPCs
}
```

My rule of thumb now: `_Validate` is for "this request should be impossible from an honest client." Everything else is normal gameplay feedback.

### Channel routing

- All goes to every connected player.
- Whisper goes to the sender and the target, matched by unique net ID.
- Team routing exists, but the team lookup is still a TODO.

That last one is deliberate. Teams are a game rule, so the plugin isn't allowed to know how they work. When the GameMode starts assigning teams, the project layer will provide the team lookup through an interface, and ChatCore will stay ignorant of what a "team" means in Tumble Teams. Plugins in this project never depend on each other directly. The game layer wires them together.

## The widget: logic in C++, looks in Blueprint

The UI is split in two:

- `UChatWidgetBase` (C++) finds the chat component, binds delegates, and handles input.
- `WBP_Chat` (Blueprint child) owns the layout, colors, and per-channel styling.

The input flow borrows from games I've played a lot. Enter opens and closes the chat box. Tab cycles channels, but only while typing, so Tab stays free for gameplay the rest of the time.

That's where I hit the most interesting UI problem of the week. My first version overrode `NativeOnKeyDown`, and Enter and Tab simply never arrived. The reason is how Slate routes keyboard events:

- **Bubbling** (`NativeOnKeyDown`) starts at the focused widget and travels *up*. The focused widget is the `EditableTextBox`, and it consumes Enter (commit) and Tab (focus navigation) before the parent sees them.
- **Tunneling** (`NativeOnPreviewKeyDown`) travels *down* from the root first, so the parent gets the first look.

Switching to the preview handler fixed it:

```cpp
FReply UChatWidgetBase::NativeOnPreviewKeyDown(const FGeometry& InGeometry, const FKeyEvent& InKeyEvent)
{
    if (bIsTyping && InKeyEvent.GetKey() == EKeys::Tab)
    {
        CycleChannel();
        return FReply::Handled();
    }

    return Super::NativeOnPreviewKeyDown(InGeometry, InKeyEvent);
}
```

If a parent widget needs a key that a child normally eats, tunneling is the tool.

## Errors I hit (and the fixes)

These cost me the most time, so here they are in one place in case they save someone else an evening.

**`Cannot open include file: 'UObject/CoreOnline.h'`**
The online ID types were moved out of that old path in UE5. They now live in the `CoreOnline` module, under `Online/CoreOnline.h`. Update the include and add `CoreOnline` to your `Build.cs` dependencies. Since the type appears in my public headers, I added it as a **public** dependency.

**`Cannot find file 'GenericTeamAgentInterface.h'`**
This header belongs to `AIModule`, which surprised me for something team-related. Adding `AIModule` as a private dependency fixed it.

**`Cannot resolve symbol 'SetLockMouseToViewport'`**
That's an older API. On the input mode structs, use `SetLockMouseToViewportBehavior(EMouseLockMode::DoNotLock)` instead.

**`UbaServer - bind 0.0.0.0:1345 failed`**
This looks alarming in the build log, but it isn't a compile error. It comes from Unreal Build Accelerator (UBA) failing to bind a local port. My build succeeded regardless.

A note on public vs. private dependencies, because I was confused about it: the split has nothing to do with portability. If a module's types appear in your **public headers**, other modules that include those headers need it, so it goes in `PublicDependencyModuleNames`. If you only use it inside `.cpp` files, it goes in `PrivateDependencyModuleNames`. For ChatCore that meant `CoreOnline` and `UMG` were public, and `OnlineSubsystem`, `OnlineSubsystemUtils`, and `AIModule` were private.

## Where it stands now

Working:

- Display names pulled from EOS and registered on the server
- All and Whisper channels end to end
- Length limit with sender-only error feedback
- `WBP_Chat` with per-channel colors, wired into the game's PlayerController
- A two-player Play-In-Editor test (two players, run under one process) passing

Still open:

- Server-side rate limiting. There's a length limit but no frequency limit yet. Without one, a modified client could spam the Server RPC and the server would broadcast every message to everyone, so the server would amplify the spam. The fix is to store the last send time per player on the server and reject messages that arrive too fast (starting at roughly 0.5 seconds, to be tuned), using the same sender-only failure path. The client will check too, to avoid wasted RPCs, but the server is the authority. The UI side for this error is already done.
- A cap on chat history. The client's message list grows forever right now. I'll keep the latest 200 in a ring buffer and remove old widgets from the scroll box at the same time, since trimming only the array doesn't help if the widgets keep piling up.
- Excluding the plugin's demo map from packaged builds.

Deliberately postponed: team routing (waits for team assignment), join/leave system messages (waits for the session layer), voice chat, and a right-click menu for report/block (that needs EOS moderation services and is well beyond a warm-up project).

## What I'd change

I'd build the chat system the same way again, but I'd start it later. A warm-up project exists to bring the unknowns out early, and I spent my first days on something I was fairly sure I could do, while the riskiest item, deploying a dedicated server to AWS, slid back.

My planning doc now has a rule: before starting anything that isn't on the week's plan, write down what it pushes back. It doesn't stop me from changing course, but I have to say what it costs first.

Next devlog: the input system and the pawn initialization setup I'm building so GAS can plug in later without a rewrite.
