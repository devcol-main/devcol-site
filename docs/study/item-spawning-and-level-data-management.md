---
title: Item Spawning and Level Data Management
outline: deep
---

# Item Spawning and Level Data Management

*Unreal Engine 5, C++*

I had three levels (Basic, Intermediate, and Advanced, getting smaller in that order) and needed a way to scatter the item classes from the [interface](/study/interface-based-item-class-design) and [collision](/study/collision-based-item-pickup) posts around at random. I also wanted to change which items show up without recompiling every time a drop rate changed.

## Random spawn points inside a box

`ASpawnVolume` wraps a `UBoxComponent`, which is just an invisible collision box, and picks a random point inside it.

```cpp
FVector ASpawnVolume::GetRandomPointInVolume() const
{
	FVector BoxExtent = SpawningBox->GetScaledBoxExtent(); // half-extents, scale included
	FVector BoxOrigin = SpawningBox->GetComponentLocation();

	return BoxOrigin + FVector(
		FMath::FRandRange(-BoxExtent.X, BoxExtent.X),
		FMath::FRandRange(-BoxExtent.Y, BoxExtent.Y),
		FMath::FRandRange(-BoxExtent.Z, BoxExtent.Z)
	);
}
```

`SpawnItem()` then calls `GetWorld()->SpawnActor<AActor>()` at that point. I dropped one `BP_SpawnVolume` into each of the three levels and scaled it to fit.

## When a random point is a bad point

A random point inside the box can land inside a wall, on top of another item, or in the air. `SpawnActor` can handle the overlap case through its spawn parameters:

```cpp
FActorSpawnParameters Params;
Params.SpawnCollisionHandlingOverride =
	ESpawnActorCollisionHandlingMethod::AdjustIfPossibleButAlwaysSpawn;

AActor* Spawned = GetWorld()->SpawnActor<AActor>(ItemClass, SpawnLocation, FRotator::ZeroRotator, Params);
```

`AdjustIfPossibleButAlwaysSpawn` nudges the actor out of whatever it overlaps and spawns it anyway. The other options are `DontSpawnIfColliding`, which gives up when the spot is blocked, and `AlwaysSpawn`, which ignores the overlap. `SpawnActor` returns `nullptr` when a spawn fails, so the caller should check the result. That matters for the coin count in [Controlling Game Flow with a Game Loop](/study/game-loop-and-flow-control), which only counts spawns that returned an actor.

## Moving drop rates into a data table

If "this item has a 12% chance to spawn" is hardcoded, every tweak means a rebuild. A data table avoids that. You define a row structure once in C++, then edit the values in the editor or import them from a CSV, with no recompiling either way.

```cpp
USTRUCT(BlueprintType)
struct FItemSpawnRow : public FTableRowBase
{
	GENERATED_BODY()

public:
	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	FName ItemName;

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	TSubclassOf<AActor> ItemClass; // which Actor to spawn

	UPROPERTY(EditAnywhere, BlueprintReadWrite)
	float SpawnChance;
};
```

One CSV detail to remember: pasting an asset's "Copy Reference" path isn't enough for a Blueprint class. You have to add a `_C` suffix by hand, or the data table can't resolve the generated class.

## Weighted selection

Each row carries its own `SpawnChance`, so picking one isn't a single dice roll. You add up all the chances into a total, roll one random number against it, and walk through the rows adding up chance until the roll falls inside a row's share.

```cpp
float TotalChance = 0.0f;
for (const FItemSpawnRow* Row : AllRows)
{
	if (Row) TotalChance += Row->SpawnChance;
}
// then roll FMath::FRandRange(0.f, TotalChance) once, and walk the
// rows accumulating chance until the roll falls inside a row's slice
```

This needs only one random number no matter how many items are in the table, and the weights don't have to add up to 100. A total of 450 works the same way, because everything is relative to `TotalChance`. The cost is that the running total has to be recalculated whenever an item is added or removed.

The rest of the pick is the walk through the rows. Here is `GetRandomItem()` with that part filled in, using `AllRows` and `TotalChance` from the snippet above:

```cpp
FItemSpawnRow* ASpawnVolume::GetRandomItem()
{
	const float Roll = FMath::FRandRange(0.0f, TotalChance);

	float Accumulated = 0.0f;
	for (FItemSpawnRow* Row : AllRows)
	{
		Accumulated += Row->SpawnChance;
		if (Roll < Accumulated)
		{
			return Row;
		}
	}
	return nullptr; // empty table, or every chance is zero
}
```

With chances of 50, 30, and 20, the total is 100. A roll of 62 gets past the first row (accumulated 50), falls inside the second (accumulated 80), and picks it. Any roll below 50 picks the first row. A row's real probability is its chance divided by the total, so a row with chance 12 in a table that adds up to 450 is picked about 2.7% of the time. A row with chance 0 can never be picked, because the roll has to be strictly less than the running total.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5)
