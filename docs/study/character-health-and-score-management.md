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

## What the numbers do

A minimal version of both functions shows where the clamp and the death check go. The class name is a placeholder.

```cpp
void AMyCharacter::AddHealth(float Amount)
{
	Health = FMath::Clamp(Health + Amount, 0.0f, MaxHealth);
}

float AMyCharacter::TakeDamage(float DamageAmount, FDamageEvent const& DamageEvent,
	AController* EventInstigator, AActor* DamageCauser)
{
	const float ActualDamage = Super::TakeDamage(DamageAmount, DamageEvent, EventInstigator, DamageCauser);

	Health = FMath::Clamp(Health - ActualDamage, 0.0f, MaxHealth);
	if (Health <= 0.0f)
	{
		OnDeath();
	}
	return ActualDamage;
}
```

Calling `Super::TakeDamage()` first keeps the default behavior, which broadcasts Unreal's built-in damage events (`OnTakeAnyDamage` and the point and radial versions). Blueprints and other components can still react to damage that way.

Health is clamped at zero, so a second hit that lands before the death animation finishes would call `OnDeath()` again. A `bIsDead` flag checked at the top of `TakeDamage()` prevents that.

`GetHealth()` is `BlueprintPure`, so a health bar widget can bind to it directly and read the current value each time it draws.

## What OnDeath usually needs

Reaching zero health should do a few separate things, and `OnDeath()` is the one place to put them:

- Stop the player from moving. `DisableInput()` on the character, passing its player controller, cuts input without destroying anything.
- Play the death animation. `PlayAnimMontage()` on the character takes a montage asset assigned in the editor.
- Tell the rest of the game. Other systems shouldn't poll the character to find out it died. The character calls into the game state or the game mode, which decides what a death means for the level.

Keeping the function `virtual` and `BlueprintCallable`, as above, lets a Blueprint child add effects without touching the C++.

## Score

Score isn't part of the character. It lives on `GameState`, coordinated by `GameMode`, because the current score belongs to the game rather than to the player character. Coins call into that instead of storing a score themselves. The GameMode and GameState split is covered in [Controlling Game Flow with a Game Loop](/study/game-loop-and-flow-control).

A coin finds the current game state with `GetWorld()->GetGameState<T>()`, using the project's own GameState class as `T`, and reports to it. That's the only link between a pickup and the score.

[GitHub](https://github.com/devcol-main/BC_Ch3_Assignment_5)
