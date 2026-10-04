---
title: Embedding GIFs and Images in a GitHub README
outline: deep
---

# Embedding GIFs and Images in a GitHub README

*Git, GitHub*

Guides for adding a GIF to a GitHub README are easy to find. Guides for getting the size and alignment right, so it isn't huge, stretched, or stuck against the left edge, are harder to find. This is what worked for me.

## Getting the GIF

If you just need a clip, copy the link from [Giphy](https://giphy.com/) using the link button on the GIF page. If you have your own footage as an MP4, convert it with a free web tool such as [FreeConvert](https://www.freeconvert.com/) or [ezgif's video-to-GIF converter](https://ezgif.com/video-to-gif). Nothing needs installing for a one-off.

## Where the file lives

A GIF can be hosted somewhere else (Giphy gives you a URL) or committed to the repo itself. Committing it is more reliable, because the image can't disappear when someone else's link dies. A folder like `docs/` or `assets/` keeps the repo root clean.

Inside the repo, a relative path is enough:

```html
<img src="docs/demo.gif" width="400" alt="Gameplay demo">
```

The path is relative to the README's own location, so a README in the repo root uses `docs/demo.gif`. Relative paths only work where GitHub renders the README. If the same README is shown on another site (a package registry, for example), the image breaks, and a full `https://raw.githubusercontent.com/<user>/<repo>/main/docs/demo.gif` URL is the safer choice.

## Sizing it

Plain Markdown image syntax (`![alt](url)`) has no size control, so use raw HTML.

```html
<img src="path-to.gif" width="400" alt="description">
```

Set only one of `width` or `height` and leave the other out. Setting both can distort the image in some renderers. Leaving one out works everywhere.

A percentage scales with the reader's screen instead of a fixed pixel size:

```html
<img src="path-to.gif" width="100%">
```

If the GIF's own resolution is small, stretching it to 100% makes it blurry. A fixed `width` that matches the GIF's real size avoids that.

A `style` attribute such as `style="max-width: 800px;"` doesn't work in a README, because GitHub strips `style` attributes from README HTML. Running a snippet through GitHub's Markdown rendering API confirms it: the attribute comes back removed. What GitHub does add is `max-width: 100%` on every image. So a fixed `width="800"` already shrinks on a narrow screen and never overflows, and no extra CSS is needed.

## Centering

GitHub left-aligns images by default. Wrapping the tag in a centered paragraph fixes that.

```html
<p align="center">
  <img src="path-to.gif" width="50%">
</p>
```

The `align` attribute survives GitHub's filtering, unlike `style`. A caption goes inside the same paragraph, after a line break:

```html
<p align="center">
  <img src="path-to.gif" width="400" alt="Drop kick hit detection"><br>
  <em>Drop kick hit detection</em>
</p>
```

## Two images side by side

An HTML table puts two GIFs next to each other. Give each image `width="100%"` so it fills its own cell, and the two share the row evenly.

```html
<table>
  <tr>
    <td><img src="before.gif" width="100%" alt="Before"></td>
    <td><img src="after.gif" width="100%" alt="After"></td>
  </tr>
</table>
```

## Different images for light and dark mode

Screenshots with a white background look harsh in GitHub's dark theme. The `<picture>` element lets you supply a second image for dark mode, and GitHub keeps it when rendering:

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/ui-dark.png">
  <img src="docs/ui-light.png" alt="Inventory screen">
</picture>
```

The `<img>` inside is the fallback, so it's the one that shows in light mode and anywhere `<picture>` isn't supported.

## Keeping the file size down

GIFs get large quickly, and a README with several multi-megabyte GIFs loads slowly. Things that help, roughly in order of effect:

- Trim the clip to the few seconds that show the point.
- Reduce the width. A GIF displayed at 400 px doesn't need to be recorded at 1920 px.
- Lower the frame rate to 10 to 15 fps. Most UI and gameplay demos still read fine.
- Run it through an optimizer. ezgif's optimize tool reduces colors and drops redundant frames.

Size matters for the repository too. GitHub warns on files over 50 MiB and rejects pushes with files over 100 MiB. Every version of a binary file stays in Git history, so re-committing a revised 20 MB GIF several times adds up. For projects that keep a lot of large assets, [Managing Unreal Engine Projects with Git LFS](/study/git-lfs-for-unreal-engine-projects) covers moving them out of regular history.

## Don't skip alt text

Every example above has an `alt` attribute. It's what screen readers read, and it's what shows if the image fails to load. A short description of what the GIF demonstrates is enough.
