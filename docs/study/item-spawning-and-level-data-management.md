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

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5)
