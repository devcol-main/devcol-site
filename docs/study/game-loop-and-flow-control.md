---
title: Controlling Game Flow with a Game Loop
outline: deep
---

# Controlling Game Flow with a Game Loop

*Unreal Engine 5, C++*

Turning "3 levels, 30 seconds each, next level as soon as all coins are collected, game over after level 3" into an actual class structure — which mostly comes down to picking the right home for global game state.

## GameMode vs. GameState

Unreal offers two natural places to put game-wide logic, and they're not interchangeable:

- **GameMode** holds server-only rules — win/lose conditions, team assignment, player spawning. Clients can't reach it directly, which makes it the wrong place for anything a client also needs to know (remaining time, current score).
- **GameState** holds state that's meant to be shared: it's created on the server and replicated down to clients, so both sides end up looking at the same numbers.

Since the level loop needs things like elapsed time and score to be client-visible from the start (and would need to be, even more so, in a multiplayer version of this), the loop lives on `GameState` rather than `GameMode`.

## Making SpawnVolume report back what it spawned

Counting "how many coins are left to collect" requires knowing whether what just got spawned was actually a coin — so `SpawnItem()` / `SpawnRandomItem()` change from returning `void` to returning the spawned `AActor*`:

```cpp
AActor* ASpawnVolume::SpawnRandomItem()
{
	if (FItemSpawnRow* SelectedRow = GetRandomItem())
	{
		if (UClass* ActualClass = SelectedRow->ItemClass.Get())
		{
			return SpawnItem(ActualClass);
		}
	}
	return nullptr;
}
```

That return value is what lets the level-start logic increment a coin counter with a simple `IsA()` check, rather than needing the spawn volume to know anything about scoring itself.

## The loop itself

`AMainGameState` owns the level timer, the running score, and two coin counters — `SpawnedCoinCount` and `CollectedCoinCount` — so "has the player cleared this level" is just a comparison between the two:

```cpp
void AMainGameState::StartLevel()
{
	SpawnedCoinCount = 0;
	CollectedCoinCount = 0;

	TArray<AActor*> FoundVolumes;
	UGameplayStatics::GetAllActorsOfClass(GetWorld(), ASpawnVolume::StaticClass(), FoundVolumes);

	for (int32 i = 0; i < 40; i++)
	{
		if (ASpawnVolume* SpawnVolume = Cast<ASpawnVolume>(FoundVolumes[0]))
		{
			AActor* SpawnedActor = SpawnVolume->SpawnRandomItem();
			if (SpawnedActor && SpawnedActor->IsA(ACoinItem::StaticClass()))
			{
				SpawnedCoinCount++;
			}
		}
	}

	GetWorldTimerManager().SetTimer(LevelTimerHandle, this,
		&AMainGameState::OnLevelTimeUp, LevelDuration, false);
}

void AMainGameState::OnCoinCollected()
{
	CollectedCoinCount++;
	if (SpawnedCoinCount > 0 && CollectedCoinCount >= SpawnedCoinCount)
	{
		EndLevel(); // cleared early — don't wait out the timer
	}
}
```

`OnLevelTimeUp()` and `OnCoinCollected()` both funnel into the same `EndLevel()`, which advances `CurrentLevelIndex` and either starts the next level or calls `OnGameOver()` once `MaxLevels` is reached. Two different exit conditions (ran out of time vs. cleared every coin), one shared cleanup path.

## The catch with reloading levels

`UGameplayStatics::OpenLevel()` unloads the current world entirely and loads the new map from scratch, which means `GameState` gets recreated and re-runs `BeginPlay()` — any progress it was holding resets along with it. That's fine for per-level state (coin counts, the level timer), but not for anything meant to persist *across* levels, like total score across all three stages. That's what `GameInstance` is for: unlike `GameState`, it survives level transitions for the lifetime of the whole play session, so it's the right home for whatever needs to outlive `OpenLevel()` rather than reset with it.

## Links

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5)
