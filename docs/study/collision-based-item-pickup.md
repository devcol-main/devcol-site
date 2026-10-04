---
title: Picking Up Items on Collision
outline: deep
---

# Picking Up Items on Collision

*Unreal Engine 5, C++*

This continues [Designing Item Classes Around an Interface](/study/interface-based-item-class-design), which set up the interface and class hierarchy but left the pickup logic empty. Here I fill it in.

## Overlap instead of Hit

To pick something up just by walking into it, use an Overlap event. Overlap fires when two actors share the same space without a physical collision response, which suits pickups and trigger zones. Hit fires on an actual physical collision, like a bullet hitting a wall, so the player would have to bump into the item.

## Updating the interface for overlap delegates

Unreal's overlap delegate has a fixed signature. `OnItemOverlap` and `OnItemEndOverlap` in `IItemInterface` have to match it, so they replace the simple `AActor*` versions from the last post.

```cpp
UFUNCTION()
virtual void OnItemOverlap(
        UPrimitiveComponent* OverlappedComp,
        AActor* OtherActor,
        UPrimitiveComponent* OtherComp,
        int32 OtherBodyIndex,
        bool bFromSweep,
        const FHitResult& SweepResult) = 0;

UFUNCTION()
virtual void OnItemEndOverlap(
        UPrimitiveComponent* OverlappedComp,
        AActor* OtherActor,
        UPrimitiveComponent* OtherComp,
        int32 OtherBodyIndex) = 0;
```

`OverlappedComp` is the item's own collision component, `OtherActor` is what it overlapped (the player), and `OtherComp` is the component on that actor that triggered the overlap.

## Giving BaseItem a collision volume

`ABaseItem` now has three components: a `USceneComponent` root, a `USphereComponent` for detection, and a `UStaticMeshComponent` for the look.

```cpp
ABaseItem::ABaseItem()
{
	PrimaryActorTick.bCanEverTick = false;

	Scene = CreateDefaultSubobject<USceneComponent>(TEXT("Scene"));
	SetRootComponent(Scene);

	Collision = CreateDefaultSubobject<USphereComponent>(TEXT("Collision"));
	Collision->SetCollisionProfileName(TEXT("OverlapAllDynamic")); // overlap only, no physical block
	Collision->SetupAttachment(Scene);

	StaticMesh = CreateDefaultSubobject<UStaticMeshComponent>(TEXT("StaticMesh"));
	StaticMesh->SetupAttachment(Collision);

	Collision->OnComponentBeginOverlap.AddDynamic(this, &ABaseItem::OnItemOverlap);
	Collision->OnComponentEndOverlap.AddDynamic(this, &ABaseItem::OnItemEndOverlap);
}

void ABaseItem::OnItemOverlap(UPrimitiveComponent* OverlappedComp, AActor* OtherActor,
	UPrimitiveComponent* OtherComp, int32 OtherBodyIndex, bool bFromSweep, const FHitResult& SweepResult)
{
	if (OtherActor && OtherActor->ActorHasTag("Player"))
	{
		ActivateItem(OtherActor);
	}
}
```

I bind with `AddDynamic` because calling `OnComponentBeginOverlap()` directly takes a long parameter list that's tedious to write out by hand.

The collision preset decides what triggers the overlap. `OverlapAllDynamic` fires overlap events against moving actors only, which fits "is the player nearby" with no physical push-back. Unreal has other presets for cases that need a real block (`BlockAll`, `NoCollision`, `Pawn`, `Custom`). The player capsule needs a matching `Pawn` preset and a `"Player"` actor tag, and `OtherActor->ActorHasTag("Player")` checks that tag before an overlap counts as a pickup.

## What each item does

With that wiring in place, each item's `ActivateItem()` does its own thing. `ACoinItem` holds the shared "you got points" logic, so `BigCoinItem` and `SmallCoinItem` only set `PointValue` and call `Super::ActivateItem()`.

```cpp
void ACoinItem::ActivateItem(AActor* Activator)
{
	if (Activator && Activator->ActorHasTag("Player"))
	{
		GEngine->AddOnScreenDebugMessage(-1, 2.0f, FColor::Green,
			FString::Printf(TEXT("Player gained %d points!"), PointValue));
		DestroyItem();
	}
}
```

Healing works the same way but restores HP. The call into the character's health system is still a TODO in this version, because it depends on how that system turns out.

The mine is different. Instead of resolving on overlap, it starts an `FTimerHandle` for a delayed `Explode()`. It keeps its own `ExplosionRadius` and `ExplosionDamage`, separate from the detection radius that triggered it. Noticing the player and hurting the player don't have to happen at the same distance.
