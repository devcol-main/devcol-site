---
title: Designing Item Classes Around an Interface
outline: deep
---

# Designing Item Classes Around an Interface

*Unreal Engine 5, C++*

Coins, a heal, and a mine all react to the same few events: the player overlaps them, they get used, and they report what type they are. What happens inside each reaction is different for every item. That's a good case for a C++ interface rather than one big shared base class.

## Interface vs. inheritance

With inheritance, a child gets the parent's real implementation and can use it or override it. An interface only declares the function signatures and leaves the behavior to whatever implements it.

The interface keeps coupling low, because a caller only needs to know the function exists. Adding a new item type means implementing the interface, and nothing else changes. A single `TArray<IItemInterface*>` can hold every item type and call the same functions on all of them.

I also tried to keep the interface small. It's tempting to add hooks for things you might want later, but then you end up with an interface that nobody implements the same way.

## The interface

Unreal splits an interface into two classes: a `UInterface`-derived class for the reflection system, and the C++ interface you actually implement.

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

Every function takes `AActor*` instead of a more specific type. Casting later costs little, and the interface doesn't need to change when a new kind of actor calls into it. `GetItemType()` returns an `FName` rather than an `FString`, because for a simple type tag `FName` is cheaper to compare and much lighter.

## A shared base item

`ABaseItem` implements the interface with empty bodies, so each concrete item only overrides what it needs.

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

`ABaseItem` and `ACoinItem` never set `ItemType`. They're meant to be abstract, and the label is set by the concrete class that actually gets placed in the world, such as `BigCoinItem` or `SmallCoinItem`.

## Coins, healing, and a mine

`ACoinItem` adds a `PointValue` shared by all coins without picking a value.

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

`ABigCoinItem` and `ASmallCoinItem` set the value and their `ItemType`, then override `ActivateItem()`.

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

`AHealingItem` and `AMineItem` don't share anything coin-specific, so they inherit straight from `ABaseItem`.

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

A coin, a heal, and a mine do three different things inside `ActivateItem()`, yet all of them are called the same way through the same interface function. Adding a fourth item later doesn't touch the existing ones.
