---
title: "A Status Look the Client Never Showed: Replicated Tags That Arrive Before BeginPlay"
description: "In PSEUDO, a client never showed an enemy's status particles and overlay if the status was already running when the enemy appeared on that client. The replicated tags landed before BeginPlay registered the tag listener, so no change event ever came. The fix reads the current tags right after registering."
date: 2026-11-07
publishAt: 2026-11-12
track: "Status look missing on client"
category: "Debugging / Networking"
sidebar: "Status Look Missing on Client"
image: /blog/pseudo-status-look-c.jpg
outline: deep
tags: [UE5, GAS, Networking, VFX, Debugging]
---

# A Status Look the Client Never Showed: Replicated Tags That Arrive Before BeginPlay

Enemies in PSEUDO show their status on the body: Poison, Slow and Burn each get a Niagara system on the mesh plus a material overlay. The [Elements](/wiki/pseudo/systems/elements) page has what the statuses do in play. A component on every non-dedicated machine, `UPseudoStatusLookComponent`, follows the replicated status tags and shows or hides the looks. It holds no gameplay state, it only reacts to tags. I'd already had [one bug in this component with Burn](./2026-11-05-pseudo-burn-status-recursion-crash). This one was about timing, and it only happened on a client.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-status-look-c.jpg" alt="The status tags reached the client before the look component started listening." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-status-look-c-dark.jpg" alt="The status tags reached the client before the look component started listening." loading="lazy">
</figure>

## The symptom

- **Expected**: every machine that renders shows every running status on every enemy.
- **Observed**: when I spawned an enemy and gave it a status in the same call, the server showed the look and the client never did. If I gave the status 1.5 s after the spawn, the client showed it.
- **Reproduce**: my combat test map, PIE listen server and one client. On the host, in one script call: freeze enemies, spawn a dummy enemy 300 cm away, apply Poison for 30 s. For the relevancy variant: start a status, move the client more than 150 m away (the enemy's net cull distance is 15000 cm), wait until the client drops the enemy, then move back.

## What I ruled out (and what I confirmed)

I added a diagnostic log at the end of the component's `InitWithAbilitySystem` that printed which status tags were already on the ability system at that moment.

| # | Hypothesis | How I checked | Result |
|---|---|---|---|
| 1 | The tag is on the client but the look isn't shown | In the client world: tag count for `Status.Poison` = 1, active Niagara components on the mesh = 0, no overlay. Server: 1 system and the overlay | Confirmed symptom |
| 2 | The tag is already there when the listener registers, so no event comes | The new log on the client said the tag was already on, and no `shows` line followed. On the server the tag wasn't on yet, and `shows` came when the effect landed | **Confirmed** |
| 3 | The same happens on a return to relevancy | Moved the client far away (enemy destroyed on the client), then back: a new client actor, log `already on: Status.Burn`, 0 systems | **Confirmed**, same path |
| 4 | The tag arrives late and the event is missed for some other reason | Applied Burn while the enemy was already on the client: the client logged `shows Status.Burn` one frame after the server | Ruled out. Events work; only the starting state is missed |

The log before the fix:

```
[12.32.56:254][549] [server] BP_PseudoEnemy_Dummy_C_8 follows statuses, already on: none
[12.32.56:314][549] [server] BP_PseudoEnemy_Dummy_C_8 shows Status.Poison
[12.32.56:450][552] [client] BP_PseudoEnemy_Dummy_C_8 follows statuses, already on: Status.Poison
[12.33.49:242][649] [client] BP_PseudoEnemy_Dummy_C_9 follows statuses, already on: Status.Burn
```

The third line is the whole bug: the client starts following statuses, Poison is already on, and nothing is ever shown.

## The cause

Enemies use the `Minimal` gameplay effect replication mode, so a client doesn't get the effects themselves, only the tags they grant, through the ability system's replicated minimal tag map.

When an actor channel opens on a client (a fresh spawn, a return to relevancy, a late join), the initial replicated properties are applied before `BeginPlay`. So on the client the `Status.Poison` count went from 0 to 1 while nobody was listening. Then `APseudoEnemyCharacter::BeginPlay` called `InitWithAbilitySystem`, which registered `RegisterGameplayTagEvent(StatusTag, NewOrRemoved)`. That delegate only fires on later changes. The count was already 1 and stayed 1, so the event never came.

On the server the order is the other way round: the enemy runs `BeginPlay` first, then the effect is applied, so the listener sees the change. That's why the server was never affected, and why a status applied 1.5 s after the spawn worked on the client too.

## The fix

After registering the listeners, the component now shows every status that is already on, unless the enemy is dead:

```cpp
// A client that receives the enemy with a status running (spawned with it, back in relevancy, late join) gets the tags in the
// spawn bunch, before this registration: no event will come for them, so show them now
if (AbilitySystem->HasMatchingGameplayTag(PseudoGameplayTags::State_Dead))
{
	return;
}
for (const UPseudoElementDefinition* Element : Elements)
{
	if (AbilitySystem->HasMatchingGameplayTag(Element->StatusTag))
	{
		UE_LOG(LogPseudoStatusLook, Log, TEXT("[%s] %s already has %s"), GetOwner()->HasAuthority() ? TEXT("server") : TEXT("client"), *GetNameSafe(GetOwner()), *Element->StatusTag.ToString());
		Show(*Element);
	}
}
```

`Show` ignores a status that is already running, so if an event does arrive later for the same tag, the look isn't doubled. I removed the diagnostic log once the fix was in.

## Checking it

PIE listen server and one client, High settings:

- Fresh spawn with Poison and Burn: the client shows 2 systems and the overlay, the same as the server.
- Back in relevancy with Burn running: the new client actor shows 1 Burn system.
- Ends: the client logs `hides` in the same frame as the server, for a caught-up Burn and a caught-up Poison. Afterwards there are 0 status tags and 0 status systems on every enemy in both worlds.
- 4 `already has` lines in total, all on the client, which is where the catch-up is expected to happen.

## What I took from it

**A tag listener only hears changes, not the current state.** Any component that follows replicated tags with `RegisterGameplayTagEvent` also has to read the current count right after it registers. Another component of mine, the reaction component, already did this for its stop status; the status look component didn't.

**On a client, replicated state can be there before `BeginPlay`.** The server applies the effect after `BeginPlay`, so a server-only test never shows this order. The client order is the one that bites.

**Test client-side looks with an actor that arrives with the state already on.** A status applied while the client is watching takes the event path and works. Spawn and apply in the same frame, or leave and re-enter relevancy, to test the starting-state path.
