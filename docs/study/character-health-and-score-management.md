---
title: Character Health and Score Management
outline: deep
---

# Character Health and Score Management

*Unreal Engine 5, C++*

## Why health lives on the character, not PlayerState

`PlayerState` is Unreal's usual answer for per-player data, but it earns its keep specifically in multiplayer — synchronizing things like score or kill count between server and clients. In a single-player game there's no synchronization problem to solve, so `MaxHealth` and `Health` just live directly on the character class instead. It's a deliberate short-term call, not a permanent one — if this ever needs multiplayer, `PlayerState` is the more scalable home for this data, but building that in now would be solving a problem that doesn't exist yet.

## Damage and healing

Unreal's built-in damage system is two functions talking to each other: `UGameplayStatics::ApplyDamage()` is the call an attacker makes, and it internally tries to call `AActor::TakeDamage()` on the receiving end — a virtual function every actor already has, ready to be overridden.

```cpp
UFUNCTION(BlueprintPure, Category = "Health")
float GetHealth() const;

UFUNCTION(BlueprintCallable, Category = "Health")
void AddHealth(float Amount);

protected:
UPROPERTY(EditAnywhere, BlueprintReadWrite, Category = "Health")
float MaxHealth;

UPROPERTY(VisibleAnywhere, BlueprintReadWrite, Category = "Health")
float Health;

virtual float TakeDamage(
    float DamageAmount,
    struct FDamageEvent const& DamageEvent,
    AController* EventInstigator,  // who/what caused the damage
    AActor* DamageCauser           // the object that actually dealt it (a bullet, an explosion)
    ) override;

UFUNCTION(BlueprintCallable, Category = "Health")
virtual void OnDeath();
```

`AddHealth()` runs the recovered amount through `FMath::Clamp` so healing items can't push health past `MaxHealth`. `TakeDamage()`'s return value is the damage actually applied — usually identical to `DamageAmount`, but the hook is there for damage reduction or amplification if that's ever needed. `OnDeath()` fires once health crosses zero, and is the natural place for disabling input, switching to a ragdoll, or playing a death animation.

With that in place, the mine item's `ActivateItem()` from [Picking Up Items on Collision](/study/collision-based-item-pickup) calls `UGameplayStatics::ApplyDamage()` on whatever it caught in its blast radius, and the healing item calls `AddHealth()` directly — same character-side system, two different items driving it.

## Score

Score works the same way conceptually as health, but lives a level up — on `GameState`, coordinated through `GameMode` — rather than on the character, since "current score" is really game-flow data rather than something intrinsic to the player character itself. Coin items call into that instead of tracking a score value on the character. The GameMode/GameState split itself is worth its own explanation — see [Controlling Game Flow with a Game Loop](/study/game-loop-and-flow-control).

## Links

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5)
