---
title: Embedding GIFs and Images in a GitHub README
outline: deep
---

# Embedding GIFs and Images in a GitHub README

*Git, GitHub*

Getting a GIF onto a GitHub README page is easy to find guides for. Getting the *sizing and alignment* right — so it doesn't render huge, stretched, or jammed against the left edge — is the part that's oddly hard to find written down anywhere, so here's what actually works.

## Getting the GIF itself

Two practical options:

1. **Already have a clip you like?** Grab its link from [Giphy](https://giphy.com/) — click the link button on the GIF page and use that URL directly.
2. **Have your own footage as an MP4?** Convert it with any of the free web converters — [FreeConvert](https://www.freeconvert.com/), [ezgif's video-to-GIF tool](https://ezgif.com/video-to-gif), or similar. No software install needed for a one-off conversion.

## Sizing it properly in Markdown

Plain Markdown image syntax (`![alt](url)`) doesn't give any control over size — for that, drop into raw HTML instead:

```html
<img src="path-to.gif" width="400" alt="description">
```

The key rule: **only set one of `width` or `height`, and let the other be implied.** Setting both explicitly is the thing that causes distorted, stretched-looking images in some renderers — it works in some viewers, but it's not worth the risk when omitting one property entirely just works everywhere.

For something that should scale with the reader's screen instead of a fixed pixel size:

```html
<img src="path-to.gif" width="100%">
```

The catch: if the source GIF's actual resolution is small, stretching it to 100% width just makes it look blurry. A safer middle ground caps how large it's allowed to get:

```html
<img src="path-to.gif" style="width: 100%; max-width: 800px;">
```

That scales down gracefully on a narrow screen while never blowing past 800px on a wide one.

## Centering it

GitHub's Markdown renderer left-aligns images by default. Wrapping the tag in a centered paragraph fixes that:

```html
<p align="center">
  <img src="path-to.gif" width="50%">
</p>
```
