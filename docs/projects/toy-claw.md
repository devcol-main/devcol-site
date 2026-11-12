---
title: Toy Claw
description: "A 3D claw-machine game you can play in the browser. Real physics, a two-button arcade control, a visible grip gauge, a 15-toy collection and ten challenges. Built with Unity 6 (URP) for the web and Android."
outline: deep
---

# Toy Claw

*Unity 6 · URP · WebGL and Android*

Toy Claw is a claw machine with real physics. The toys pile up, lean on each other and slide off the claw on the way to the chute, the same way they do in an arcade. You play it with two buttons: hold the first one to move the claw sideways, let go, then hold the second one to move it forward. The claw drops the moment you let go of the second button.

<GameFrame slug="toy-claw" title="Toy Claw, a 3D claw-machine game" hint="The first load is about 11 MB. Click the game once to use the keyboard." />

## How to play

| Input | Action |
|---|---|
| **INSERT COIN** / `Space` | Start a play |
| Hold the left button / `J` | Move sideways, release to stop |
| Hold the right button / `K` | Move forward, release to drop |
| **POWER GRIP** / `L` | Use a Power Grip charge on this play (before the drop) |

![A play in progress: the claw over the toy pile, the two hold buttons at the bottom and the coin count at the top](/projects/toy-claw-1.jpg)

Each play shows its grip strength on a gauge as the claw goes down. A weak grip can still pick a toy up, but it is more likely to lose it on the way to the chute. After eight misses in a row, the next play has a full-strength grip.

**Power Grip** is a limited skill. It locks the grip at full strength and lets the claw hold a toy that only one finger caught. You start with three charges and get one back every five misses.

## Modes

- **Classic** uses coins. You start with 10, and one comes back every three minutes up to 10. Toys you win also pay coins.
- **Challenge** has ten goals, such as "Win 2 toys in 10 tries" or "Win the Unicorn". Each attempt costs one coin, and the tries inside it are free. Clearing one unlocks the next and pays coins or Power Grip charges the first time.
- **Zen** is free play with no records, for when you just want to work the claw.

## Collection

![The catch popup after winning a Crocodile: NEW TOY, the Epic rarity tag and +15 coins](/projects/toy-claw-2.jpg)

There are 15 toys in four rarities: six Common, six Rare, two Epic and one Legendary (the Unicorn). Rarer toys are scarcer in the machine. The first catch of each toy pays coins, and the third copy turns it gold.

Your coins, collection and cleared challenges are saved in this browser only. Like the other games on this site, it sends anonymous play counts (challenge cleared or failed, prizes won), described in the [Privacy Policy](/privacy-policy).

## Credits

3D models, textures, music and sound effects: ithappy, *Claw Machine Free – Low Poly 3D Models Pack*. Game code, balance and UI: devcol.
