---
title: Embedding GIFs and Images in a GitHub README
outline: deep
---

# Embedding GIFs and Images in a GitHub README

*Git, GitHub*

Guides for adding a GIF to a GitHub README are easy to find. Guides for getting the size and alignment right, so it isn't huge, stretched, or stuck against the left edge, are harder to find. This is what worked for me.

## Getting the GIF

If you just need a clip, copy the link from [Giphy](https://giphy.com/) using the link button on the GIF page. If you have your own footage as an MP4, convert it with a free web tool such as [FreeConvert](https://www.freeconvert.com/) or [ezgif's video-to-GIF converter](https://ezgif.com/video-to-gif). Nothing needs installing for a one-off.

## Sizing it

Plain Markdown image syntax (`![alt](url)`) has no size control, so use raw HTML.

```html
<img src="path-to.gif" width="400" alt="description">
```

Set only one of `width` or `height` and leave the other out. Setting both can distort the image in some renderers. Leaving one out works everywhere.

For an image that scales with the reader's screen instead of a fixed pixel size:

```html
<img src="path-to.gif" width="100%">
```

If the GIF's own resolution is small, stretching it to 100% makes it blurry. Capping the width helps.

```html
<img src="path-to.gif" style="width: 100%; max-width: 800px;">
```

That shrinks on a narrow screen and stops at 800px on a wide one.

## Centering

GitHub left-aligns images by default. Wrapping the tag in a centered paragraph fixes that.

```html
<p align="center">
  <img src="path-to.gif" width="50%">
</p>
```