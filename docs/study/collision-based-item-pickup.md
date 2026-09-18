---
title: Picking Up Items on Collision
outline: deep
---

# Picking Up Items on Collision

*Unreal Engine 5, C++*

Follow-up to [Designing Item Classes Around an Interface](/study/interface-based-item-class-design) — that post defined the interface and class hierarchy with the actual pickup logic left empty. This one wires it up.

## Overlap, not Hit

To pick up an item just by walking near it, the right tool is an **Overlap** event, not a **Hit** event:

- **Overlap** fires when two actors start occupying the same space with no physical collision response — the right choice for pickups, trigger zones, anything where "touching" is the whole signal.
- **Hit** fires on an actual physical collision (a bullet hitting a wall). Using it for pickups would mean the player physically bumping into the item rather than just walking through it.

## Updating the interface for overlap delegates

Unreal's overlap delegate has a fixed signature, so `IItemInterface`'s `OnItemOverlap` / `OnItemEndOverlap` need to match it exactly rather than the simplified `AActor*`-only version from the previous post:

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

`OverlappedComp` is the item's own collision component, `OtherActor` is whatever it overlapped (the player), and `OtherComp` is the specific component on that other actor that triggered the overlap.

## Giving BaseItem an actual collision volume

`ABaseItem` now owns three components: a `USceneComponent` root, a `USphereComponent` for detection, and a `UStaticMeshComponent` for how it actually looks:

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

`AddDynamic` is doing delegate binding here rather than calling `OnComponentBeginOverlap()` directly — mainly because the direct call's parameter list is long enough to be genuinely unpleasant to write out by hand every time, and binding at runtime means the same event can be wired up dynamically wherever it's needed.

Collision presets decide what actually triggers that overlap: `OverlapAllDynamic` fires overlap events against moving actors only, which is the right fit for "does the player happen to be nearby" without any physical push-back. (Unreal ships several other presets — `BlockAll`, `NoCollision`, `Pawn`, `Custom` — for cases that need an actual physical block instead of just a signal.) The player capsule needs a matching `Pawn` preset and a `"Player"` actor tag, which is what `OtherActor->ActorHasTag("Player")` checks for before treating the overlap as a real pickup.

## Per-item overlap behavior

With the plumbing in place, each item's `ActivateItem()` override does its own thing:

**Coins** — `ACoinItem` owns the common "you got points" logic, so `BigCoinItem`/`SmallCoinItem` only need to set `PointValue` and call `Super::ActivateItem()`:

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

**Healing** works the same way, just recovering HP instead of points — the actual heal call into the player character's health system is the one piece left as a TODO here, since it depends on how that system ends up shaped.

**The mine** is the odd one out: instead of resolving instantly on overlap, it starts a `FTimerHandle` for a delayed `Explode()` call, and tracks its own `ExplosionRadius` / `ExplosionDamage` separately from the detection radius that triggered it in the first place — so "the player got close enough to notice" and "the player was close enough to get hurt" aren't forced to be the same distance.
