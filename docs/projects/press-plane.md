---
title: Press Plane
outline: deep
---

# Press Plane

*Unity, released on Google Play*

Press Plane is an endless sky-run arcade game in the style of Flappy Bird. You hold the screen to power the engines and climb, release to cut the power and fall, and try to last as long as you can. The only goal is a higher score.

![Press Plane gameplay screenshot](/projects/press-plane-1.png)

## Controls

There's one input. Hold (touch, or click with a mouse) to climb. Release to descend. That's all, so a run can start and end in seconds, which is why it works well in short sessions on a phone.

## How it differs from Flappy Bird

In Flappy Bird, a tap ignores how fast the bird was falling and sets its upward speed straight to a fixed value. A tap is a jump, and the speed you had a moment earlier doesn't matter. The input is close to on or off.

In Press Plane, the fall speed carries over. While you aren't holding, the plane falls and builds up downward speed. Holding adds upward thrust, and that thrust first has to cancel the downward speed before the plane stops falling and starts to climb. So the same input behaves differently depending on what the plane was doing a moment before.

Three things follow from that:

1. A quick tap after a long drop barely slows you down. To turn around you have to commit to holding, which feels closer to working a throttle than to jumping.
2. Momentum works in both directions. If you hold too long, the plane keeps climbing past where you wanted to stop, so you can overcorrect as easily as undercorrect.
3. Timing means something different. In a tap game you decide when to tap. Here you decide when to start holding and also for how long.

If you've been falling for a while, start holding earlier than feels natural, because the plane needs time to stop before it can rise. When you're climbing, ease off before the gap, because the plane keeps going up after you let go.

## How it works in the code

The game is a handful of small scripts: `Player` and `Movement` for the plane, `InputHandler` for input, `LoopScroll` and `Obstacle` for the world, and a `GameManager` that ties scoring, game over, and saving together. The numbers below come from the scripts and the Player prefab.

### Flying with a force, not a velocity

The plane is a dynamic `Rigidbody2D` with a mass of 1, a gravity scale of 1, and no linear damping. Holding the screen doesn't set a speed. `Player.FixedUpdate()` checks the "Fly" action every physics step, and while it's held, `Movement` adds an upward force:

```csharp
// Player.cs (trimmed)
private void FixedUpdate()
{
    if (inputHandler.flyAction.IsPressed() && isAlive)
    {
        ApplyUpwardForce();   // calls Movement.ApplyUpwardForce()
        // dust particles and the engine sound also run here
    }
    ApplyAngle();
}

// Movement.cs
public void ApplyUpwardForce()
{
    rb2d.AddForce(Vector2.up * upwardForce);   // 25 on the Player prefab
}
```

That is where the behavior described above comes from. `AddForce` changes the velocity a little each step instead of replacing it, so gravity and thrust fight over the plane's speed. With no damping, nothing slows it down except the opposite force. Input uses Unity's Input System: `InputHandler` enables an action map named "Player" and looks up the "Fly" action.

### The tilt

The plane's angle follows its vertical speed, so it points up while climbing and down while falling:

```csharp
private void ApplyAngle()
{
    float targetAngle = isAlive
        ? Mathf.Atan2(rb2d.linearVelocityY, 10f) * Mathf.Rad2Deg
        : -90;

    angle = Mathf.Lerp(angle, targetAngle, Time.fixedDeltaTime * 10f);
    transform.rotation = Quaternion.Euler(0, 0, angle);
}
```

A vertical speed of 10 gives a 45-degree tilt, and the `Lerp` smooths the turn instead of snapping to the new angle. When the plane dies the target becomes -90, so it nose-dives.

### The plane stays put and the world moves

When a run starts, the plane's X position is frozen. The ground and the obstacles scroll left instead. `LoopScroll` moves each object and, once it passes an end point, sends it back to the right side:

```csharp
// LoopScroll.cs (trimmed)
void FixedUpdate()
{
    transform.Translate(Vector2.left * scrollSpeed * Time.deltaTime);
    if (transform.position.x <= endPosition)
        SendMessage("OnScrollEnd", SendMessageOptions.DontRequireReceiver);
}
```

`SendMessage` calls every script on that object with a method of that name. On an obstacle, both `LoopScroll` and `Obstacle` have an `OnScrollEnd()`, so one message moves the obstacle back to the right edge and also gives it a new random height. The height is picked with `Random.Range(-3.3f, 3f)`. Obstacles are reused this way, so no obstacle is created or destroyed during a run. Only effects like particles and sound objects are.

Scrolling speed is set once when a run starts, from a value that defaults to 3 in `NormalScene`, and none of the scripts change it afterward. A run gets harder from the momentum and the random gaps, not from the world getting faster.

### Scoring

Each obstacle has a trigger area, and leaving it with the player tag counts as passing:

```csharp
// Obstacle.cs
void OnTriggerExit2D(Collider2D collision)
{
    if (collision.gameObject.CompareTag(TagName.Player))
        GameManager.Instance.IncreaseScore();
}
```

`Score` adds one point, updates the text, and checks for a new high score. The first time a run beats the stored best, it plays a special sound with confetti. After that it plays a normal score sound, and a longer one on every tenth point.

### Taking damage and dying

Touching the ground or an obstacle calls `Damage()`. The prefab sets `hp` to 1, so the first hit ends the run. When health is above zero, which only happens with a bonus life, the plane becomes invulnerable for one second and blinks five times. That is done with two coroutines that run in parallel.

`Death()` stops the engine sound and the music, plays the death sound, turns off the collider, triggers the "Die" animation, and calls `GameManager.GameOver()`. The plane object is disabled two seconds later.

### Game over, rewards, and saving

`GameManager.GameOver()` saves the game first. On Android it then checks the death-count achievement for Google Play Games and, when the run set a new best of 10 or more, sends it to the leaderboard. It also rolls `Random.Range(0, 3)`, and on a 1 it asks whether to watch a rewarded ad. The prize comes from a spin wheel that can land on nothing, one bonus life, or two. A bonus life restarts the scene, and `NormalScene` passes it to the player as extra `hp`.

Saving is a small interface. A component that needs to persist implements `ISaveable` with `PopulateSaveData()` and `LoadFromSaveData()`. `SaveLoadManager` fills one data object from the sound settings, the score (including the best score), and the timer. On Android it saves to Google Play Games when the player is online and falls back to a local file when they aren't. In the Unity editor it always writes a local file, which `LocalSaveLoad` stores as JSON under Unity's persistent data path. It saves on game over and when the app quits.

## Play in browser

<div style="max-width: 400px;">
<iframe src="https://itch.io/embed-upload/15969002?color=333333" width="100%" height="600" frameborder="0" allowfullscreen></iframe>
</div>

The web build is fine for trying the controls. For a real run, the Android app plays better on a phone.

[Google Play](https://play.google.com/store/apps/details?id=com.devcol.press_plane) · [itch.io](https://devcol.itch.io/pressplane) · [GitHub](https://github.com/devcol-main/PressPlane) · [Trailer](https://youtu.be/zQBN3ye_jtY)
