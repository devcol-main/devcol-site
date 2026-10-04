---
title: Character Health and Score Management
outline: deep
---

# Character Health and Score Management

*Unreal Engine 5, C++*

## Why health lives on the character

`PlayerState` is the usual place for per-player data, but it mainly matters in multiplayer, where it keeps things like score and kills in sync between server and clients. This is a single-player game, so there's nothing to sync. `MaxHealth` and `Health` sit directly on the character class. If the game ever becomes multiplayer, `PlayerState` would be the better home, but I'm not going to build for that yet.

## Damage and healing

Unreal's damage system is two functions. An attacker calls `UGameplayStatics::ApplyDamage()`, and that calls `AActor::TakeDamage()` on the target. Every actor already has `TakeDamage()` as a virtual function, so the character overrides it.

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

`AddHealth()` clamps with `FMath::Clamp` so healing can't go over `MaxHealth`. `TakeDamage()` returns the damage actually applied, which is usually the same as `DamageAmount` but leaves room for reduction or amplification later. `OnDeath()` runs once health reaches zero, and it's where input would be disabled or a death animation played.

The mine from [Picking Up Items on Collision](/study/collision-based-item-pickup) calls `ApplyDamage()` on whatever is inside its blast radius, and the healing item calls `AddHealth()` directly.

## Score

Score isn't part of the character. It lives on `GameState`, coordinated by `GameMode`, because the current score belongs to the game rather than to the player character. Coins call into that instead of storing a score themselves. The GameMode and GameState split is covered in [Controlling Game Flow with a Game Loop](/study/game-loop-and-flow-control).

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5)
