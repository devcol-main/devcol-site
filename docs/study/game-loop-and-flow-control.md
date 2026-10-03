---
title: Controlling Game Flow with a Game Loop
outline: deep
---

# Controlling Game Flow with a Game Loop

*Unreal Engine 5, C++*

The rules were three levels of 30 seconds each, moving on as soon as every coin is collected, with game over after level 3. Turning that into classes mostly meant deciding where the global state should live.

## GameMode vs. GameState

GameMode holds server-only rules such as win and lose conditions, team assignment, and player spawning. Clients can't reach it, so it's the wrong place for anything a client also needs, like remaining time or the current score.

GameState is created on the server and replicated to clients, so both sides see the same numbers. The level loop needs elapsed time and score to be visible to clients, and it would need that even more in a multiplayer version, so the loop lives on `GameState`.

## Making SpawnVolume report what it spawned

To count how many coins are left, I needed to know whether each spawned item was a coin. So `SpawnItem()` and `SpawnRandomItem()` now return the spawned `AActor*` instead of `void`.

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

With that return value, the level-start code can count coins with a plain `IsA()` check, and the spawn volume doesn't need to know anything about scoring.

## The loop

`AMainGameState` owns the level timer, the score, and two counters, `SpawnedCoinCount` and `CollectedCoinCount`. Clearing a level is just a comparison between them.

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
		EndLevel(); // cleared early, so don't wait for the timer
	}
}
```

Running out of time and collecting every coin both end up in `EndLevel()`. It advances `CurrentLevelIndex` and either starts the next level or calls `OnGameOver()` once `MaxLevels` is reached.

## What reloading a level does

`UGameplayStatics::OpenLevel()` unloads the current world and loads the new map from scratch, so `GameState` is recreated and runs `BeginPlay()` again. Anything it was holding resets. That's fine for per-level data like coin counts and the timer, but it's a problem for things that should last across levels, such as the total score over all three stages. `GameInstance` survives level changes for the whole play session, so that data belongs there.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5)
