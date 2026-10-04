---
title: "Moving Health into GAS, and Head-Up Bars for Every Player"
description: "Migrating character health from a component to GAS attributes, then building replicated, team-aware, occlusion-aware health and stamina bars above every player's head in Unreal Engine 5."
date: 2026-10-02
outline: deep
---

# Moving Health into GAS, and Head-Up Bars for Every Player

After [stamina](./2026-10-02-tumble-teams-gas-stamina-and-sprint) went into the Gameplay Ability System, health was next, along with the UI to show it: segmented bars above every player's head, visible to everyone in multiplayer.

What I wanted: health managed like stamina, bars in ten-point segments (an Overwatch-style look), stamina shown only to your own team, your health and teammates' health in white and enemies' in red, and every bar hidden when its character isn't visible.

## Health as one attribute

The old `UStatusComponent` is gone from character logic:

- **Damage** goes through `TakeDamage` into an instant gameplay effect with a `SetByCaller` delta (negative means damage).
- **Buffs** raise MaxHealth first and then Health, so the Health clamp doesn't cut the increase.
- **Death** is detected on the server by an attribute-change delegate, firing once when Health goes from above zero to zero or below.

The component class itself stays in the repo for now because lobby and character Blueprints still reference it, and deleting it risks load warnings. Cleanup comes after I've checked those Blueprints.

The ability system component is reached through a virtual function: the base character returns null (only players use the PlayerState's ASC), so health logic never touches the base class's own ASC member.

**The PlayerState's ASC outlives the pawn**, so two things are required: unbind the Health delegate when a pawn goes away (`UnPossessed` and `EndPlay`), or a dead pawn's callback lingers, and reset vitals in `PossessedBy`, restoring MaxHealth to its default 100 so a buff doesn't carry over to a new pawn.

## The bars above heads

- **The widget tracks its owning character, not the local player.** A HUD can read `GetOwningPlayerPawn`, but a world-space widget hangs on every character, so the widget component hands its owner to the widget. Health, stamina and exhaustion are already replicated to everyone, so other players' bars just work. The widget polls every frame instead of subscribing, which makes it immune to the PlayerState arriving after the widget.
- **Segments**: ceil(max / 10) cells (100 gives 10; 150 after a buff gives 15; capped at 30). Cells are rebuilt only when the max changes and repainted only when value or color changes.
- **Visibility rules**: stamina shows for the local player or a teammate (both teams assigned), and only for yourself if teams aren't assigned yet. Hidden bars keep their space, so the layout doesn't change shape. For "hide when the character isn't visible" I reused `WasRecentlyRendered(0.25)`, with 0.25 s of slack to avoid flicker. Other players' "running" state isn't replicated, so I estimate it from speed (above 1.5 times walking speed).
- **Occlusion**: the bar is hidden when a line trace from the camera to the bar hits static geometry (all pawns ignored). Changing the widget component's space from Screen to World also gives proper depth testing and distance scaling.
- **Your own bars** moved into a 2D HUD in the bottom-left (icon placeholder, health, stamina) and your overhead bar is hidden for you but still shown to others. The HUD's layout is generated in code unless a designer places the same-named widgets.

## Bugs along the way

**The bar never faced the camera on the host.** Camera-facing logic ran in the character's `Tick` only when `HasAuthority()` was false. On a listen server the host has authority over every pawn, so those widgets never rotated. Worse, the player character starts with tick disabled and nothing enables it. I moved rotation and visibility into the widget component's own `TickComponent`, independent of the character's tick settings, excluding only dedicated servers.

**C++ defaults silently overridden by the Blueprint.** The head widget's class, size, height, and space were saved in the character Blueprints, so my constructor defaults did nothing. When code changes don't change behavior, check what the Blueprint stored. I set the Blueprint values with a headless Python script (widget class `PlayerVitalsWidget`, 200 by 40, scale 0.5, Z 125) and hid the component in the lobby Blueprint.

**Live Coding blocked by a different project.** "Unable to build while Live Coding is active" appeared while my own editor was closed. The Unreal Build Tool's check uses a system-wide mutex keyed on the engine executable path, so any editor running the same engine blocks builds for every project. The culprit was an editor from another project.

**The customization system wasn't attaching any parts.** Every PIE logged `Item table row struct is missing Category/SkeletalMesh`, and characters had only the base body. The data table columns are exposed with internal names like `Category_2_<GUID>`. I couldn't pin one root cause, so I made the reflection code defensive: look fields up by authored name or internal prefix, compare values as text keys so enum, byte, name and string all work, accept soft and hard mesh references, and when a field isn't found, log every field name and type plus why each item was skipped. When reading user-defined structs by reflection, assume as little as possible about names and types, and make failure loud.

Local build notes: a local variable named `Widget` shadowed `UWidgetComponent::Widget` (an error in this project), and editing with deleted classes means closing the editor and building with UBT instead of hot reload.

## Verification

| Check | Result |
|---|---|
| Damage 30, then 20 | 100 to 70 to 50 |
| Buff | 50/100 to 100/150 (max and current together) |
| Death | 400 damage gives HP 0, max stays 150, extra damage keeps 0, one death event |
| Respawn | 0/150 resets to 100/100 |
| Two-player listen server | host pawn 75, client pawn 60 on both sides (replication confirmed) |
| Bar look, team colors, occlusion | confirmed by eye (the screenshot API failed, so no automated check) |

Known limits: occlusion hiding uses a GPU occlusion query, so a bar can take a frame or two to disappear behind a wall (a camera-to-head ray trace is the stricter alternative), and there was one editor crash from the Slate stack with no frames from my module, so I couldn't attribute it.
