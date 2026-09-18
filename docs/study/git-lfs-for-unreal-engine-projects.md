---
title: Managing Unreal Engine Projects with Git LFS
outline: deep
---

# Managing Unreal Engine Projects with Git LFS

*Git, Unreal Engine (applies just as much to Unity or any other asset-heavy project)*

Unreal projects are full of exactly the kind of files Git handles badly — `.uasset`, `.umap`, `.fbx`, audio, source art — and a plain Git history of binary files that keep changing just grows forever. Git LFS exists for this specific problem.

## How it actually works

Instead of storing a large file's full contents in Git, LFS stores a small text pointer (a hash and a size) in its place. The real file body goes to separate LFS storage, and gets fetched on demand:

- **Commit**: LFS swaps the tracked file for a pointer before it goes into Git.
- **Push**: the actual file body goes to LFS storage, not the regular Git server.
- **Clone**: pointers download first (fast), then only the large files needed for the checked-out version get pulled from LFS.

Worth knowing going in: GitHub's free plan caps LFS at 10 GiB storage and 10 GiB bandwidth *per month*. Hit either limit and LFS uploads/downloads just stop working until the next billing cycle — cloning still succeeds, it just leaves you with pointers instead of the actual assets.

## Setup

```bash
# once per machine
git lfs install

# track large-file patterns
git lfs track "*.psd"
git add .gitattributes   # this file has to be committed too
```

For an Unreal project specifically, `.gitattributes` is where the actual asset types get declared:

```
# Unreal Engine binary assets
*.uasset filter=lfs diff=lfs merge=lfs -text
*.umap filter=lfs diff=lfs merge=lfs -text
*.fbx filter=lfs diff=lfs merge=lfs -text

# Audio
*.wav filter=lfs diff=lfs merge=lfs -text
*.mp3 filter=lfs diff=lfs merge=lfs -text

# Source art
*.psd filter=lfs diff=lfs merge=lfs -text
*.blend filter=lfs diff=lfs merge=lfs -text
```

Two things worth not getting wrong here: PNG/JPG aren't LFS targets by default, and dumping every plain image into LFS burns through the quota fast for no real benefit. And build output — `.exe`, `.dll`, `.vcxproj` — belongs in `.gitignore`, not LFS; those aren't things worth storing at all, pointer or otherwise.

To check tracking actually took:

```bash
git lfs track          # patterns currently tracked
git lfs ls-files -s    # tracked files, with size
```

## Staying inside the free-tier limits

`.gitignore` should come first, catching build artifacts and editor-generated junk (`Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/`) before LFS ever needs to consider them — no reason to burn quota on files that shouldn't be versioned at all. `.gitattributes` handles what's left in terms of tracking real assets efficiently.

The other lever is avoiding unnecessary `clone`s and `push`es of the same large binaries, since every one of those spends real bandwidth against the 10 GiB/month cap. Sharing bulky source assets through a separate free cloud drive and keeping `fetch`/`pull` for code changes only cuts down on LFS traffic considerably when bandwidth is the actual constraint, not just storage.

## Links

[Git LFS](https://git-lfs.com/)
