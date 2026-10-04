---
title: "Why Enter Wouldn't Open My UE5 Chat Box (and Why It Crashed with Two Players)"
description: "Three layers of keyboard-focus bugs in an Unreal Engine 5 chat widget: SetInputMode being queued, SetFocus silently falling back, and a stack overflow that only appears when two PIE clients share one Slate instance."
date: 2026-09-10
outline: deep
---

# Why Enter Wouldn't Open My UE5 Chat Box (and Why It Crashed with Two Players)

I'm building a chat plugin for Tumble Teams, my multiplayer warm-up project. The chat widget is a C++ base class that grabs keyboard focus so Enter can open the input box. In practice, pressing Enter did nothing, and then, once I tested with two players, the editor crashed. The cause was three separate focus problems stacked on top of each other, and each one hid the next.

## Layer 1: the viewport takes focus back

The first symptom: click the game viewport once, and Enter never reopens chat. `FInputModeGameAndUI` only gives the widget keyboard focus once, in `NativeConstruct`. Clicking the viewport makes the engine hand focus back to the viewport widget, and without focus my widget's preview-key handler stops firing.

The fix was to override `NativeOnFocusLost` and re-take focus with `SetFocus()`, but only when the user isn't mid-typing. A `bIsTyping` guard keeps this from fighting the deliberate focus moves between the input box and the widget.

## Layer 2: something else was overwriting my input mode

The next symptom was subtler: right after the game starts, Enter doesn't open chat, even though the focus code above is in place.

The culprit was outside the plugin. The project's character class called `SetInputMode(FInputModeGameOnly)` in its own `BeginPlay`, in the same frame my widget's `NativeConstruct` had requested `GameAndUI`. The character's call won.

My first fix, re-calling `SetInputMode` from `NativeOnFocusLost`, did nothing, because **`SetInputMode`'s widget-focus request isn't applied immediately**. It's queued on the `LocalPlayer`, and at the end of the frame only the last request is applied. My widget never received focus in that frame, so `NativeOnFocusLost` had no chance to fire. I confirmed this by polling `has_keyboard_focus()` on the live instance through editor Python: it stayed `False` for 13 seconds.

My second attempt called `SetFocus()` directly instead. Still `False`. The third time I read the engine source and found the real mechanism: `UWidget::SetFocus()` first tries to set Slate user focus immediately, but if that fails (for example, because the underlying Slate widget isn't attached to the viewport window yet), it **silently falls back to the same deferred `LocalPlayer` queue**. In `NativeConstruct` the widget often isn't attached yet, so my "direct" call was quietly queued, and then lost to the character's `GameOnly` request.

The fix was to defer the initial `SetFocus()` to the next tick:

```cpp
GetWorld()->GetTimerManager().SetTimerForNextTick(this, &UChatWidgetBase::ClaimInitialFocus);
```

By then the widget is attached and every other actor's `BeginPlay` for that frame has already run. Focus held for as long as I watched it, across several PIE restarts.

One more trap from this stage: after hot reloading C++ changes to the base class, the already-loaded child Blueprint widgets sometimes didn't pick up structural changes. The fix was to explicitly recompile and save the child Blueprints. A full editor restart avoids the whole class of problem.

## Layer 3: two players, one Slate, infinite recursion

Then I ran PIE with two players, and the editor died with `EXCEPTION_STACK_OVERFLOW`. The crash dump showed `NativeOnFocusLost` calling into UMG, into Slate, and back into `NativeOnFocusLost`, hundreds of times.

In multi-client PIE under one process, each player has their own `PlayerController` and their own chat widget, in separate windows. But the process has a single `FSlateApplication`, and each client's `LocalPlayer` gets `ControllerId` 0, so `SetFocus()` maps both widgets to the **same Slate user focus slot**. When one widget reclaims focus in `NativeOnFocusLost`, it steals it from the other, which immediately reclaims it back, synchronously, forever.

This can't happen in a shipped game, where players are separate processes on separate machines. It's purely a multi-client-PIE artifact, but it still needs handling so the editor remains usable:

1. **Re-entrancy guard.** A `bIsReclaimingFocus` flag makes a nested `NativeOnFocusLost` do nothing. That stops the crash, but leaves the window that never got focus stranded.
2. **Don't fight window activation.** If the focus-loss cause is `EFocusCause::WindowActivate`, don't reclaim. The engine already restores the last-focused widget when a window activates, and fighting it recreates the ping-pong.
3. **Windows that never had focus.** They have no "last focused widget" to restore, so each widget binds to its own window's activation event and asks for focus when the window becomes active and the widget doesn't have it.

I verified this by activating the two PIE windows alternately from a script and checking `has_keyboard_focus()` after each switch: exactly one widget held focus each time, with no crash.

## Afterwards

When a focus call should have worked and didn't, I now ask whether it was applied or just queued. A bug that only shows up with two clients in one process may not be a game bug at all. Here it came from a single shared `FSlateApplication`. And reading the engine source beat guessing: three reasonable fixes failed before the source explained why.

*Update: I later replaced this C++ widget with a Blueprint UI on top of the C++ transport layer, so the code above is no longer in the build. What I learned about focus still applies. The story of that change is in [Testing Chat with Two Players](./2026-09-27-tumble-teams-chat-two-player-testing).*
