---
title: "Gameplay Cues Never Reach PIE Clients When Fired From Editor Python: FEditorScriptExecutionGuard Makes Every RPC Local in UE5"
description: "In UE 5.8, server-fired gameplay cues looked like they never replicated to play-in-editor clients, but only in scripted tests. Editor Python wraps every call in FEditorScriptExecutionGuard, which sets GAllowActorScriptExecutionInEditor, and AActor::GetFunctionCallspace then returns Local for every RPC, multicasts included. How I proved it with LogNet VeryVerbose and fixed it in the cheat manager."
date: 2026-11-23
workedOn: 2026-11-21
publishAt: 2026-11-23
track: "Editor Python RPCs"
category: "Debugging / Networking"
sidebar: "Editor Python Runs RPCs Locally"
image: /blog/pseudo-script-guard-c.jpg
outline: deep
tags: [UE5, Networking, GAS, Gameplay Cues, Python, Testing, Debugging]
---

# Gameplay Cues Never Reach PIE Clients When Fired From Editor Python: FEditorScriptExecutionGuard Makes Every RPC Local in UE5

If you drive multiplayer tests from editor Python and a multicast, client RPC or server RPC never seems to leave the machine it was called on, check the caller before you check the networking. Every UFunction call that the Python plugin makes runs inside `FEditorScriptExecutionGuard`, which sets the global `GAllowActorScriptExecutionInEditor`. While that flag is set, `AActor::GetFunctionCallspace` answers "Local" for every RPC, before it even looks at the RPC flags or the net mode. In PSEUDO (UE 5.8.3) this made server-fired gameplay cues look broken in four separate test runs. The cues were fine in real play. The fix was a few lines in the cheat manager that drop the flag while a cheat runs in a game world.

<figure class="theme-img">
  <img class="img-light" src="/blog/pseudo-script-guard-c.jpg" alt="Editor Python set a script guard that made the cue multicast run only on the server." loading="lazy">
  <img class="img-dark" src="/blog/pseudo-script-guard-c-dark.jpg" alt="Editor Python set a script guard that made the cue multicast run only on the server." loading="lazy">
</figure>

## Four workarounds built on a wrong premise

PSEUDO's hit feedback (sparks, weak point flashes, broken part effects) is played with gameplay cues fired on the server. In several test runs the client never showed them: a broken-part cue played on the host only, a cheat that applied damage did not get its hit cue to the client, one run logged zero client cue lines twice, and another counted three element hits on the host and one on the client. Each time I wrote a workaround around "server cues don't reach clients".

Other tests did not fit that story. When the hit came from real input (injected Enhanced Input) or from enemy AI, the same cue arrived on the client. What the failing tests had in common was that the hit was started by a cheat console command, and the cheat was run from editor Python.

This was not the first time editor Python had made an RPC stay home. An earlier post, [The Server Never Swapped](./2026-10-19-pseudo-predicted-weapon-swap), describes a cheat that called itself 2317 times in one frame because its `ServerCheat` RPC ran locally on the client. Back then I only had a suspicion about why. This time I traced it.

## What I compared

| # | Hypothesis | How it was checked | Result |
|---|---|---|---|
| 1 | The ability system component's replication mode hides cues (enemies Minimal, players Mixed on the PlayerState) | In Minimal and Mixed mode, executed cues go through the component's unreliable `NetMulticast_InvokeGameplayCue*`. An AI-driven enemy attack, fired from a montage notify on the server tick, reached the client: server 1, client 1 | Ruled out |
| 2 | Relevancy, net cull distance, cue batching or `AbilitySystem.GameplayCue.*` cvars | Same enemy, same players, same distance. Only the caller differed between failing and working cases. No custom cue manager, no cue cvars set | Ruled out |
| 3 | In-process PIE versus a separate client process | Failing and working cases ran in the same in-process session | Ruled out |
| 4 | The caller's context: editor Python | Read the engine source along the call path | Confirmed by code |
| 5 | Measured: the same cue on the same actor with the guard kept and dropped | `log LogNet VeryVerbose` around one probe command | Confirmed |

## How editor Python turns an RPC into a local call

Three pieces of engine code line up:

1. `PyUtil::InvokeFunctionCall` in the Python Script Plugin wraps every `ProcessEvent` in `FEditorScriptExecutionGuard`. That covers `unreal.SystemLibrary.execute_console_command` and anything else you call from Python, and it also applies inside callbacks registered with `register_slate_post_tick_callback`. A tick callback does not get you out of it.
2. The guard sets `GAllowActorScriptExecutionInEditor = true` for the duration of the call.
3. `AActor::GetFunctionCallspace` checks that flag first and returns `FunctionCallspace::Local` when it is set. The flag exists so that editor-placed actors can run script in the editor, so the function treats the call as "run it here". Components forward the question to their owning actor, so component RPCs behave the same way.

Everything the cheat did ran synchronously inside that one guarded call: the console command, the cheat, `ApplyGameplayEffectSpecToTarget`, and finally the cue multicast `NetMulticast_InvokeGameplayCueExecuted_FromSpec`. The multicast ran once, on the server, and was never sent.

Real gameplay never hit this. Input, AI, timers and montage notifies all run on the world tick, outside any Python call, so the flag is not set.

## Seeing it in the log

`AActor::GetFunctionCallspace` logs its decision under `LogNet` at VeryVerbose. With the guard kept, one probe printed:

```
GetFunctionCallspace ScriptExecutionInEditor: NetMulticast_InvokeGameplayCueExecuted_FromSpec
```

With the guard dropped:

```
GetFunctionCallspace Multicast: NetMulticast_InvokeGameplayCueExecuted_FromSpec
```

To count the effect, I added a cue trace (`pseudo.Debug.CueTrace 1`, which logs every routed cue per machine through `UGameplayCueManager::OnGameplayCueRouted`) and a probe cheat that fires a melee hit cue on an enemy, the host or the client, either through a gameplay effect or as a direct `ExecuteGameplayCue`. Listen server plus one client, in one process:

| Case | Guard kept: server / client | Guard dropped: server / client |
|---|---|---|
| Enemy target, cue from a gameplay effect | 1 / 0 | 1 / 1 |
| Enemy target, executed cue | 1 / 0 | 1 / 1 |
| Host player target, from a gameplay effect | 1 / 0 | 1 / 1 |
| Host player target, executed | 1 / 0 | 1 / 1 |
| Client player target, from a gameplay effect | 1 / 0 | 1 / 1 |
| Client player target, executed | 1 / 0 | 1 / 1 |
| Cheat typed on the client world (`ServerCheat` RPC) | 0 / 0 | 1 / 1 |
| Real enemy AI attack on the client player | 1 / 1 | 1 / 1 |

The client-typed row is the old weapon-swap bug: the `ServerCheat` RPC itself stayed on the client, so nothing ran anywhere.

## Dropping the guard inside the cheat manager

Cheats are how PSEUDO's tests drive gameplay, so I fixed it at that entry point. `UPseudoCheatManager` overrides `ProcessConsoleExec` and turns the flag off for the duration of the command, but only in a game world:

```cpp
bool UPseudoCheatManager::ProcessConsoleExec(const TCHAR* Cmd, FOutputDevice& Ar, UObject* Executor)
{
	const UWorld* World = GetWorld();
	const bool bDropGuard = GAllowActorScriptExecutionInEditor && World && World->IsGameWorld() && CVarCheatKeepScriptGuard.GetValueOnGameThread() == 0;
	TGuardValue<bool> ScriptGuard(GAllowActorScriptExecutionInEditor, bDropGuard ? false : GAllowActorScriptExecutionInEditor);
	return Super::ProcessConsoleExec(Cmd, Ar, Executor);
}
```

This is safe there. Actors in a PIE world run script anyway once the world's actors are initialized, and `UCheatManager::ProcessConsoleExec` already `ensure`s that the flag is false before it calls `ServerExec`, so the engine expects it to be off on this path. A console variable, `pseudo.Cheat.KeepScriptGuard 1`, keeps the old behavior for comparisons.

Once cues really reached the client, one more thing showed up: the client played the player hit effect and the melee burn flash twice (four of each against the host's two). The hit cue handler skipped a server cue on the client only when the cue carried a `Feedback.Predicted` tag, and the cheat hits carry that tag. I changed the rule to match the replicated path's rule: a client skips the server's copy only on the attacker's own machine, which already played its predicted copy. Real gameplay is unchanged, because the server's copy of a real hit never carries the predicted tag.

All six probe cases and the client-typed cheat went from 0 to 1 on the client after the change.

## If your scripted multiplayer tests disagree with play

- If a result differs between "scripted" and "played", suspect the test harness first. Fire the same cue once from a cheat and once from gameplay before you write a workaround.
- Editor Python is not a neutral driver. Any function you call from it directly runs with every RPC local: server RPCs stay on the client, client RPCs stay on the server, multicasts run once. That includes calls like `send_gameplay_event_to_actor`, ability system component functions and your own component functions.
- To check a suspicious call, run `log LogNet VeryVerbose` and look for `GetFunctionCallspace ScriptExecutionInEditor` next to the RPC name.
- Route scripted actions through one entry point you control, such as a cheat manager, and clear `GAllowActorScriptExecutionInEditor` there with a `TGuardValue` when the world is a game world. Or drive the test with real input.
- Give yourself a one-line answer to "did the cue arrive on that machine". A per-machine log of routed cues turns a long investigation into one grep.
