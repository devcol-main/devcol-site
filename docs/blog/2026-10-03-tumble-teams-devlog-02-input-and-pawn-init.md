---
title: "Tumble Teams Devlog #2: Data-Driven Input and Preparing for GAS in UE5"
description: "Setting up a tag-based Enhanced Input config, a Lyra-style pawn initialization funnel, and Ability System placement in Unreal Engine 5, before writing a single ability."
date: 2026-10-03
outline: deep
---

# Tumble Teams Devlog #2: Data-Driven Input and Preparing for GAS in UE5

In the [first devlog](./2026-08-11-tumble-teams-devlog-01-chatcore) I built a chat plugin for Tumble Teams, my one-month multiplayer warm-up project in Unreal Engine 5. This post covers the next layer down: how input reaches the character, and how the character gets initialized in a networked game.

Neither of these is exciting to look at. The Gameplay Ability System (GAS) arrives in week two, and from what I've read, GAS problems usually come from setup and not from the abilities: input bound straight to gameplay functions, state stored in the wrong place, and initialization that runs at the wrong time on clients. So this week I laid that groundwork early.

I'm using Epic's **Lyra** sample project as my main reference throughout. I'm not copying Lyra wholesale, because it's far bigger than a warm-up game needs. Its patterns answer a lot of "how should this be structured?" questions, though.

## Problem 1: input that doesn't care about gameplay

The default Enhanced Input setup binds an `InputAction` directly to a function on the character:

```cpp
EnhancedInput->BindAction(JumpAction, ETriggerEvent::Started, this, &ATumbleCharacter::Jump);
```

That works, but it hardwires "this key does this function." Once abilities exist, I want "this key activates whatever ability is tagged `InputTag.Jump`," without the character knowing which ability that is.

### Gameplay tags as the middle layer

The fix is to put a gameplay tag between the action and the behavior, and to store the mapping in a data asset:

```cpp
USTRUCT(BlueprintType)
struct FTumbleInputAction
{
    GENERATED_BODY()

    UPROPERTY(EditDefaultsOnly)
    TObjectPtr<const UInputAction> InputAction = nullptr;

    UPROPERTY(EditDefaultsOnly, Meta = (Categories = "InputTag"))
    FGameplayTag InputTag;
};

UCLASS(Const)
class UInputConfigDataAsset : public UPrimaryDataAsset
{
    GENERATED_BODY()

public:
    const UInputAction* FindNativeInputActionForTag(const FGameplayTag& InputTag) const;

    // Bound directly to C++ functions (move, look, camera).
    UPROPERTY(EditDefaultsOnly, Meta = (TitleProperty = "InputAction"))
    TArray<FTumbleInputAction> NativeInputActions;

    // Routed by tag to the Ability System. Empty until GAS is in.
    UPROPERTY(EditDefaultsOnly, Meta = (TitleProperty = "InputAction"))
    TArray<FTumbleInputAction> AbilityInputActions;
};
```

(This is simplified. The real version has a few more lookups.)

The split into two lists is the important part:

- **Native actions** are things that should never be abilities: movement, camera look. They bind straight to functions.
- **Ability actions** carry only a tag. When GAS arrives, pressing the key sends the tag to the Ability System Component, which activates whichever granted ability listens for it.

Right now `AbilityInputActions` is intentionally empty. The structure exists so that adding GAS later means filling in data, not rewriting the character.

### A small custom input component

To keep binding code readable, I subclassed `UEnhancedInputComponent` with templated helpers that look up the action by tag:

```cpp
template <class UserClass, typename FuncType>
void UTumbleInputComponent::BindNativeAction(
    const UInputConfigDataAsset* InputConfig,
    const FGameplayTag& InputTag,
    ETriggerEvent TriggerEvent,
    UserClass* Object,
    FuncType Func)
{
    check(InputConfig);

    if (const UInputAction* Action = InputConfig->FindNativeInputActionForTag(InputTag))
    {
        BindAction(Action, TriggerEvent, Object, Func);
    }
}
```

The call site then reads as intent instead of wiring:

```cpp
TumbleInput->BindNativeAction(InputConfig, TumbleTags::InputTag_Move,
    ETriggerEvent::Triggered, this, &ThisClass::Input_Move);
```

### `UDataAsset` or `UPrimaryDataAsset`?

I went back and forth on this, so here's the rule I settled on:

- **Plain `UDataAsset`** for shared configuration that lives inside a plugin. It has no dependency on the Asset Manager, which keeps the plugin portable.
- **`UPrimaryDataAsset`** for project-level assets I'll want to load by ID through the Asset Manager, pawn data, input configs, and later the minigame definitions.

Either way, shared config assets are marked `UCLASS(Const)`. They're read by many actors at runtime, and nothing should be modifying them in a running game.

One shortcut I'm knowingly taking: the input mapping context is currently loaded with `LoadSynchronous()`. That's fine for a warm-up game with tiny assets, and it's on my list to switch to async loading before the main project.

## Problem 2: when is a networked pawn "ready"?

In single-player, `BeginPlay` is a reasonable place to initialize a character. In multiplayer, it isn't, and this was the biggest mental shift of the week.

On a **client**, the pieces a character depends on arrive over the network separately and in no guaranteed order:

- the pawn itself spawns and runs `BeginPlay`,
- its `PlayerState` replicates (`OnRep_PlayerState`),
- its `Controller` replicates (`OnRep_Controller`),
- input gets set up when a local player takes control.

On the **server**, things happen in a different order again, mostly through `PossessedBy`.

If initialization lives in only one of those places, it will sometimes run before the data it needs exists. That bug tends to show up only under real network conditions, which makes it miserable to track down.

### The funnel pattern

Lyra's answer, which I'm adopting, is to stop guessing the order. Every one of those entry points calls the same function:

```cpp
void UTumblePawnExtensionComponent::CheckDefaultInitialization()
{
    // Each call checks: do I have everything I need *now*?
    // If yes, advance to the next init state. If not, return and wait —
    // another entry point will call this again when more data arrives.
}
```

The function is called from several places and is safe to call repeatedly. Whichever call arrives last, on whichever machine, is the one that completes initialization.

The thing I want to stress, because it took me a while to see it: **the expensive decision is where you call it from, not what's inside it.** If the call sites are right from day one, I can grow the function body as new systems come online (input, then GAS, then cosmetics) without touching the call sites again. If a call site is missing, no amount of logic inside the function will save me.

These components will live in a `PawnCore` plugin, following the same "no game rules inside plugins" rule as ChatCore.

### Where the Ability System Component lives

The other early decision is where to put the Ability System Component (ASC). The two common choices are on the Character or on the PlayerState.

Tumble Teams is a round-based party game: players get knocked out and respawn constantly. If the ASC were on the Character, every respawn would destroy it, along with any state I want to persist across rounds. On the **PlayerState**, it survives respawns, because the PlayerState stays alive for the player's whole session. That's also how Lyra does it.

The trade-off is that a PlayerState-owned ASC has to be told about its avatar every time a new pawn is possessed, and that has to happen on both sides:

- on the server, in `PossessedBy`,
- on the client, in `OnRep_PlayerState`.

That `InitAbilityActorInfo` timing is, as far as I can tell, where most "GAS works on the server but not on the client" bugs come from. It's also why the funnel pattern above matters: it gives me one dependable place to hook it in.

## Rules I'm keeping going into GAS

Writing these down so future me doesn't undo them:

1. **Don't store gameplay stats as replicated variables on the character.** They'll be GAS attributes, so there's nothing to migrate later.
2. **Use gameplay tags for state instead of a growing pile of bools.** `bIsStunned` today turns into a refactor tomorrow.
3. **Never bind input directly to gameplay actions.** Route ability input through tags.
4. **Check engine signatures against the source.** APIs change between engine versions, and the chat plugin already taught me that.

## What's next

My original week-one plan is still partly unfinished, so the next steps are about closing that gap rather than adding features:

1. **Replication practice with throwaway code.** Three small exercises: a door that uses `RepNotify`, a pickup that exercises the different RPC types, and a debug character for watching movement replication and `Role`/`RemoteRole` from both sides. None of it will ship; it's there to make the concepts concrete.
2. **The AWS dedicated server spike**, timeboxed. This is still the biggest unknown in the project, and I've already pushed it back once.
3. **GAS integration in week two**: wire `InitAbilityActorInfo` on both paths and fill in the ability input list.

If you're also learning Unreal multiplayer, my advice from this week is to decide where initialization happens and where the ASC lives before you write any abilities. Those two choices are hard to change later, and most of the rest isn't.
