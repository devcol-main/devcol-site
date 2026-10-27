---
title: "Numbers in Spreadsheets, References in Data Assets"
description: "How I split gameplay data in an Unreal Engine 5 project: numbers in Excel/CSV imported as DataTables, asset references and structure in Primary Data Assets, global rules in Developer Settings, and row IDs to join them. The data flow, the row-ID convention, rules for keeping CSV sheets importable, validation, and the open questions."
date: 2026-10-13
publishAt: 2026-11-02
outline: deep
---

# Numbers in Spreadsheets, References in Data Assets

*Unreal Engine 5, C++, DataTables*

Balance changes are most of the work late in a game's life, and they should be the cheapest kind of change. If a sword's damage scale lives in a Blueprint default or a C++ constant, tuning it means opening the editor, finding the right asset, and hoping nothing else depends on it. If it lives in a spreadsheet row, it's a cell edit and a reimport, and you can see every weapon's value side by side while you do it.

So in [PSEUDO](/blog/pseudo), the rule is: **gameplay numbers live in data, not in code or Blueprints.** The interesting part is that "data" in Unreal means two different things, and they're good at different jobs.

## Two kinds of data asset

| | Holds | Edited in |
|---|---|---|
| **DataTable** (imported from CSV) | Numbers and strings: stats, cooldowns, costs, damage scales, monster stats, drops | Excel → CSV export → reimport in the editor |
| **DataAsset** | Asset references and structure: pawn data, ability sets, input configs, meshes, anim classes | The editor |

The split isn't a style preference. Unreal imports CSV and JSON into DataTables (and CurveTables), and nothing else. A DataAsset can't be generated from a CSV directly. Meanwhile a DataTable row is a flat struct, which is awkward for the nested, reference-heavy shape of something like a pawn definition. Each tool ends up doing what it's built for.

There's a third bucket for rules that apply to the whole game rather than to a row: a `UDeveloperSettings` subclass, which shows up in Project Settings and is saved to a config file. That's for values that have no natural row: one number for the whole game rather than one per weapon or monster.

## The data flow

```
Excel (.xlsx)
  → CSV (UTF-8, committed to the repo)
    → DataTable (editor reimport)
      → data subsystem (lookup by row ID)
        → gameplay (stat init effects, ability numbers, spawn data)
```

The CSV is the file under version control, not the `.xlsx`. A CSV diff shows exactly which number changed in a commit; a binary spreadsheet diff shows nothing. The source CSVs live in a `Data/` folder at the project root, and the imported tables live under `Content/Data/Tables/`.

At runtime, a subsystem on the GameInstance builds lookup maps from the tables once and answers every query by row ID. Gameplay code never holds a DataTable pointer and never searches rows itself.

## Joining the two with row IDs

A DataAsset never stores a number that belongs in a table. It stores the ID of the row that holds the number.

| Table | Row ID example | Main columns |
|---|---|---|
| `DT_CharacterStats` | `Char.SC.Twinblast` | MaxHealth, MaxStamina, MaxMana, AttackPower, Defense, MoveSpeed, Luck |
| `DT_Skills` | `Skill.Twinblast.Q` | Cooldown, Cost, DamageScale, AbilityClass (soft ref), InputTag |
| `DT_Monsters` | `Monster.Grunt01` | PawnClass (soft ref), StatsRow, DropTableId |
| `DT_Drops` | `Drop.Grunt01` | ItemId, Chance |

So the pawn data for the combat character has a `StatsRow` handle pointing at `Char.SC.Twinblast`, and the actual health and attack values live only in the stats sheet. A monster row points at a stats row and a drop table by ID. Every number has exactly one home.

Applying stats to a character goes through the ability system rather than around it: an instant Gameplay Effect with SetByCaller magnitudes, filled from the stats row. That keeps "set initial stats" inside the same pipeline as every buff and debuff, with the same replication.

## Rules for sheets that import cleanly

CSV is a forgiving format until it isn't. These rules keep the import boring:

- **Row IDs follow `Category.Owner.Name`.** They read like gameplay tags, sort sensibly, and make collisions unlikely.
- **Keep sheets flat.** No array or struct columns. Unreal can parse them, but the syntax inside a cell is fragile and nobody can edit it comfortably in a spreadsheet. If a row needs a list, that's a second sheet joined by ID, the way drops are separate from monsters.
- **Asset references are `/Game/...` path strings**, which import as soft references. A table full of hard references would load every asset it mentions the moment the table loads. (More on that trade-off in [Hard vs Soft References in Gameplay Data Assets](/study/hard-vs-soft-references-for-data-assets).)
- **Save as UTF-8.** Excel's default CSV encoding varies by platform and locale, and a mangled character in a row name breaks the lookup silently.

## CSV has no referential integrity

Nothing stops a monster row from pointing at a stats row that doesn't exist, or a skill row from naming an ability class that was renamed last week. The spreadsheet won't complain, and the import won't either.

So validation is the price of the approach. `IsDataValid` checks run in the editor: missing rows behind a row handle, asset paths that don't resolve, IDs that appear twice. The same habit runs through the rest of the project's data assets, for example the combo graph checking that every montage section it names actually exists. Catching a bad row at save time is far cheaper than catching it as a monster that spawns with zero health.

## Multiplayer

Every machine loads the same tables, so clients can show numbers in UI without waiting for the server. The server is still the one that applies values: stat initialization, damage and drops all run there, and clients see the results through attribute replication. A client with an edited table gets a different tooltip, not a different fight.

## Open questions I haven't settled

- **Gameplay tag columns.** Tags in a CSV are just strings until something checks them against the tag table. I haven't decided between a plain string column validated in the editor and a dedicated tag-container column.
- **Reimport.** Manual reimport after each export is explicit but easy to forget. Auto-reimport on file change is convenient but can surprise you mid-session.
- **Per-row assets.** If some rows grow enough structure that they deserve to be real assets, a tool could generate one DataAsset per row from the sheet. Not needed yet.

## The short version

Put a number in a spreadsheet if a designer would want to compare it across rows. Put a reference or a structure in a DataAsset. Join them with a readable row ID, keep the sheet flat, commit the CSV rather than the workbook, and pay for the missing referential integrity with editor validation.
