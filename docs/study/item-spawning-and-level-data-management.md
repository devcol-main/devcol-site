---
title: Item Spawning and Level Data Management
outline: deep
---

# Item Spawning and Level Data Management

*Unreal Engine 5, C++*

Three levels (Basic, Intermediate, Advanced, shrinking in that order) needed a way to scatter the item classes from the [interface](/study/interface-based-item-class-design) / [collision](/study/collision-based-item-pickup) posts around at random, and then a way to control *which* items show up without recompiling every time a drop rate changes.

## Random spawn points inside a box

`ASpawnVolume` wraps a `UBoxComponent` — invisible, just a collision box — and picks a random point inside it:

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

`SpawnItem()` then just calls `GetWorld()->SpawnActor<AActor>()` at that point. One `BP_SpawnVolume` gets dropped into each of the three levels, scaled to fit.

## Moving drop rates out of code and into a data table

Hardcoding "this item has a 12% chance to spawn" means a full rebuild every time a designer wants to tweak a number. Unreal's data tables fix that: define a row structure once in C++, then edit the actual values either directly in the editor or via CSV import — no recompiling either way.

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

One CSV quirk worth remembering: pasting an asset's "Copy Reference" path in only gets you most of the way there — for a Blueprint class it needs a manual `_C` suffix appended, or the data table won't resolve it as the actual generated class.

## Weighted selection with cumulative probability

With multiple rows each carrying their own `SpawnChance`, picking one isn't a straight dice roll — it's summing all the chances into a running total and rolling a single random number against that total:

```cpp
float TotalChance = 0.0f;
for (const FItemSpawnRow* Row : AllRows)
{
	if (Row) TotalChance += Row->SpawnChance;
}
// then roll FMath::FRandRange(0.f, TotalChance) once, and walk the
// rows accumulating chance until the roll falls inside a row's slice
```

The appeal of doing it this way: it only needs **one** random number no matter how many items are in the table, weights don't need to add up to any particular total (100, 450, whatever — it's all relative to `TotalChance`), and it's the same underlying mechanic a pity/guarantee system would build on top of, if drop rates ever need that kind of safety net. The tradeoff is that the cumulative table has to be rebuilt any time an item is added or removed — a small bit of bookkeeping in exchange for not hardcoding percentages into the spawn logic itself.

## Links

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5)
