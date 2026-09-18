---
title: Designing Item Classes Around an Interface
outline: deep
---

# Designing Item Classes Around an Interface

*Unreal Engine 5, C++*

Item pickups (coins, a mine, a heal) all need to react to the same few events — overlapping the player, being "used," reporting their own type — even though what happens inside each reaction is completely different. That's exactly the case for a C++ interface instead of pushing everything through one shared base class.

## Interface vs. inheritance

- **Inheritance** hands a child class the parent's actual implementation, which the child can use as-is or override.
- **An interface** only defines the function signatures — "this function must exist" — and leaves the actual behavior entirely up to whatever implements it.

The payoff: lower coupling (a caller only needs to know *that* a function exists, not how it's implemented), easier extensibility (a new item type just implements the interface to plug into the existing system), and real polymorphism — a single `TArray<IItemInterface*>` can hold every item type and call the same functions on all of them regardless of what they actually are.

One rule of thumb worth keeping: **don't build an interface out further than what you actually need right now.** It's tempting to add hooks for behavior you might want later, but that's a good way to end up with an interface nobody implements consistently.

## The interface

Unreal splits an interface into two classes — a `UInterface`-derived class for the reflection system, and the actual C++ interface you implement:

```cpp
#pragma once

#include "CoreMinimal.h"
#include "UObject/Interface.h"
#include "ItemInterface.generated.h"

// This class does not need to be modified.
UINTERFACE(MinimalAPI)
class UItemInterface : public UInterface
{
	GENERATED_BODY()
};

class BC_CH3_ASSIGNMENT_5_API IItemInterface
{
	GENERATED_BODY()

public:
	// Called when the player enters this item's range
	virtual void OnItemOverlap(AActor* OverlapActor) = 0;
	// Called when the player leaves this item's range
	virtual void OnItemEndOverlap(AActor* OverlapActor) = 0;
	// Called when the item is used
	virtual void ActivateItem(AActor* Activator) = 0;
	// Returns this item's type (e.g. "Coin", "Mine")
	virtual FName GetItemType() const = 0;
};
```

Every function takes `AActor*` rather than a more specific type — casting later is a small price for not having to touch the interface every time a new actor type needs to call into it. `GetItemType()` returns an `FName` instead of `FString` for the same reason it usually should when you just need a fast, cheap type tag: `FName` comparisons are cheaper and it's a much lighter type than `FString` actually is under the hood.

## A shared base item

`ABaseItem` implements the interface with empty/default bodies, so concrete item classes only override what they actually need to change:

```cpp
// BaseItem.h
UCLASS()
class BC_CH3_ASSIGNMENT_5_API ABaseItem : public AActor, public IItemInterface
{
	GENERATED_BODY()

public:
	ABaseItem();

protected:
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Item")
	FName ItemType;

	virtual void OnItemOverlap(AActor* OverlapActor) override;
	virtual void OnItemEndOverlap(AActor* OverlapActor) override;
	virtual void ActivateItem(AActor* Activator) override;
	virtual FName GetItemType() const override;

	virtual void DestroyItem();
};
```

```cpp
// BaseItem.cpp
ABaseItem::ABaseItem()
{
	PrimaryActorTick.bCanEverTick = false; // no tick needed
}

void ABaseItem::OnItemOverlap(AActor* OverlapActor) {}    // overridden per item
void ABaseItem::OnItemEndOverlap(AActor* OverlapActor) {} // overridden per item
void ABaseItem::ActivateItem(AActor* Activator) {}        // overridden per item

FName ABaseItem::GetItemType() const { return ItemType; }

void ABaseItem::DestroyItem() { Destroy(); }
```

Neither `ABaseItem` nor the `ACoinItem` class below set `ItemType` themselves — both are meant to be abstract, with the actual label set by whichever concrete class (`BigCoinItem`, `SmallCoinItem`, ...) is the one that actually gets placed in the world.

## Coins, healing, and a mine

`ACoinItem` adds a shared `PointValue` for anything coin-shaped, without deciding what that value actually is:

```cpp
UCLASS()
class BC_CH3_ASSIGNMENT_5_API ACoinItem : public ABaseItem
{
	GENERATED_BODY()

public:
	ACoinItem();

protected:
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Item")
	int32 PointValue;
};
```

`ABigCoinItem` and `ASmallCoinItem` then just set that value and their `ItemType`, and override `ActivateItem()`:

```cpp
ABigCoinItem::ABigCoinItem()
{
	PointValue = 50;
	ItemType = "BigCoin";
}

void ABigCoinItem::ActivateItem(AActor* Activator)
{
	DestroyItem(); // a real score increment would go here too
}
```

```cpp
ASmallCoinItem::ASmallCoinItem()
{
	PointValue = 10;
	ItemType = "SmallCoin";
}
```

`AHealingItem` and `AMineItem` skip `ACoinItem` entirely and inherit straight from `ABaseItem`, since they don't share anything coin-specific:

```cpp
UCLASS()
class BC_CH3_ASSIGNMENT_5_API AHealingItem : public ABaseItem
{
	GENERATED_BODY()

public:
	AHealingItem();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Item")
	float HealAmount;

	virtual void ActivateItem(AActor* Activator) override;
};
```

```cpp
UCLASS()
class BC_CH3_ASSIGNMENT_5_API AMineItem : public ABaseItem
{
	GENERATED_BODY()

public:
	AMineItem();

	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mine")
	float ExplosionDelay;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mine")
	float ExplosionRadius;
	UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Mine")
	float ExplosionDamage;

	virtual void ActivateItem(AActor* Activator) override;
};
```

A coin, a heal, and a mine end up doing three completely different things inside `ActivateItem()` — but every one of them is called the exact same way, through the exact same interface function. That's the actual payoff: adding a fourth item type later doesn't touch any of the existing ones.
