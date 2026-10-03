---
title: Managing Unreal Engine Projects with Git LFS
outline: deep
---

# Managing Unreal Engine Projects with Git LFS

*Git, Unreal Engine (the same applies to Unity or any asset-heavy project)*

Unreal projects are full of files that Git handles badly: `.uasset`, `.umap`, `.fbx`, audio, and source art. Every time one of those binaries changes, Git keeps another full copy, and the repo only grows. Git LFS is built for that.

## How it works

Instead of storing a large file, LFS puts a small text pointer in Git, with a hash and a size. The real file goes to separate LFS storage and is fetched when needed. When you commit, the file is swapped for a pointer. When you push, the file itself goes to LFS storage rather than the Git server. When you clone, the pointers come down first, and then only the large files needed for the checked-out version.

One limit to know about: GitHub's free plan gives LFS 10 GiB of storage and 10 GiB of bandwidth per month. Past either one, LFS uploads and downloads stop until the next billing cycle. Cloning still works, but you get pointers instead of the actual assets.

## Setup

```bash
# once per machine
git lfs install

# track large-file patterns
git lfs track "*.psd"
git add .gitattributes   # this file has to be committed too
```

For an Unreal project, `.gitattributes` is where the asset types get listed.

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

PNG and JPG aren't LFS targets by default, and putting every ordinary image in LFS eats the quota quickly. Build output like `.exe`, `.dll`, and `.vcxproj` belongs in `.gitignore`, not in LFS.

To check that tracking worked:

```bash
git lfs track          # patterns currently tracked
git lfs ls-files -s    # tracked files, with size
```

## Staying inside the free tier

Start with `.gitignore`, so build artifacts and editor-generated files (`Binaries/`, `Intermediate/`, `Saved/`, `DerivedDataCache/`) never reach LFS. Then `.gitattributes` covers the real assets.

The other thing is avoiding repeated clones and pushes of the same large binaries, since each one counts against the 10 GiB monthly bandwidth. If bandwidth is the limit, sharing the bulky source assets through a free cloud drive and using `fetch` and `pull` for code only cuts LFS traffic a lot.

[Git LFS](https://git-lfs.com/)
