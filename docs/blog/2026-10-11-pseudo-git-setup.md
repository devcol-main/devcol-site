---
title: "Git Setup for a UE5 Project Before the First Push"
description: "The Git settings I sorted out for PSEUDO before pushing anything: what to ignore, which file types go to Git LFS, line endings, a commit message template, and why the repository stays private."
date: 2026-10-11
track: "Git setup before first push"
outline: deep
---

# Git Setup for a UE5 Project Before the First Push

Before the first push of PSEUDO, I went through the repository's basic settings: `.gitignore`, Git LFS, line endings, a commit message format, and the README. This is what I changed and why. For the general LFS workflow, see my [Git LFS note](/study/git-lfs-for-unreal-engine-projects).

The remote is a **private** GitHub repository. The game is meant for Steam, and the Fab and Marketplace assets in it can't be redistributed, so it has to stay private.

## `.gitignore`

What I added:

| Entry | Why |
|---|---|
| Rider's personal files under `.idea/` (`workspace.xml`, `projectSettingsUpdater.xml`, `usage.statistics.xml`, `contentModel.xml`, `shelf/`, `*.DotSettings.user`) | IDE state that differs per person and per machine |
| `*.slnx` | The engine regenerates it, like `*.sln`. `PSEUDO.slnx` and `Automation_PSEUDO.slnx` were already tracked, so I untracked them with `git rm --cached` |
| `*.pdb` | Debug symbols from every build, tens to hundreds of MB |
| `.DS_Store`, `Thumbs.db`, `desktop.ini` | Hidden OS files that show up when you drop images into `Documents` |

What I held back until I need it: plugin `Saved/` and `DerivedDataCache/` folders, `.vscode/`, per-platform `Binaries` and `Intermediate`, and `*.log` / `*.tmp` (I may keep logs in the Debugging folder).

Rider already generates a `.gitignore` that excludes `workspace.xml`. I put it in the root one too, so it's still covered if that file isn't there.

## Git LFS

I ran `git lfs install` and registered these types in `.gitattributes`:

- Unreal: `*.uasset`, `*.umap`
- Images: `png jpg jpeg tga psd exr hdr bmp gif dds`
- 3D: `fbx blend abc`
- Audio: `wav mp3 ogg bank`
- Video: `mp4 mov bk2`
- Fonts: `ttf otf`
- Other: `pdf zip 7z`

Two decisions:

- **`*.obj` is not tracked by LFS.** `.gitignore` already ignores compiled object files with that extension, and the two rules conflict. If I need `.obj` models later I'll revisit it.
- **No `lockable`.** A lockable file you haven't locked becomes read-only, so every save in the editor would need `git lfs lock`. I'm working alone, so the cost outweighs the benefit. If I add a collaborator, it's one attribute to add.

`Content/NewMap.umap` was committed before LFS was set up. I converted it with `git add --renormalize` and did not rewrite history with `git lfs migrate`, so the first commit still holds a 48 KB plain copy. That's small enough to ignore.

### The size limit

GitHub's free tier has 10 GiB of LFS storage and 10 GiB of bandwidth per month, with no rollover. With no payment method on file, going over storage blocks new LFS pushes, and going over bandwidth blocks LFS for the rest of the month. Every edit to a binary stores a whole new copy of it. I plan to use Paragon characters and MetaHumans, so I expect to hit the limit.

For now I'm staying on GitHub and checking Billing > Usage periodically. If I go over, the options are moving to Azure DevOps Repos (whose LFS limits I'd need to recheck) or adding the marketplace asset folder to `.gitignore`.

## Line endings

| Target | Rule |
|---|---|
| Default | `* text=auto` |
| `cpp c h hpp inl cs` | `text`, with a diff driver set |
| `ini uproject uplugin md txt json xml yml yaml` | `text` |
| `bat cmd ps1 sln vcxproj` | `eol=crlf` (Windows only) |
| `sh command` | `eol=lf` (Unix only) |

Global settings:

```bash
git config --global core.longpaths true      # lift the 260-character path limit on Windows
git config --global core.quotepath false     # show Korean file names correctly
git config --global init.defaultBranch main
```

## Commit messages

I added a `.gitmessage` template and set it for this repository with `git config commit.template .gitmessage`. The format is `<type>: <summary>`:

| Type | Use |
|---|---|
| `feat` | New feature |
| `fix` | Bug fix |
| `asset` | Added or changed assets |
| `bp` | Blueprint logic change |
| `refactor` | Structure change, same behavior |
| `perf` | Performance |
| `docs` | Documentation |
| `config` | Project or engine settings |
| `build` | Build, packaging, plugins |
| `chore` | Everything else |

## README

The README says which engine version to use (UE 5.8), warns that Git LFS has to be installed **before** cloning (otherwise the assets arrive as pointer files and won't open in the editor), explains how to generate project files and build, and shows the folder layout and the commit types above.

## What's left

- Create the private repository on GitHub, connect the remote and push.
- Decide a folder for marketplace assets, such as `Content/_Market/`, so one `.gitignore` line can exclude them if LFS space runs out.
- Check LFS usage regularly.
