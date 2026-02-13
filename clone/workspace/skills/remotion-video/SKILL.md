---
name: remotion-video
description: Create and render videos programmatically with Remotion. Use when making videos, motion graphics, or animated content.
---

## Overview

Remotion is a React framework for creating real MP4 videos programmatically. Each frame is a React component render — animations are driven by `useCurrentFrame()`, not CSS transitions.

## Sandbox Setup

Bun is pre-installed. Create projects under `/work/`:

```bash
cd /work
bunx create-video@latest my-video --template blank
cd my-video
bun install
```

Use `bun` instead of `npm` for all package management, and `bunx` instead of `npx` for CLI commands:

```bash
bunx remotion add @remotion/transitions   # add packages
bunx remotion render MyVideo out/video.mp4 # render
bunx remotion ffmpeg -i input.mp4 out.mp3  # ffmpeg operations
```

## Captions

When dealing with captions or subtitles, load the [./references/subtitles.md](./references/subtitles.md) file for more information.

## Using FFmpeg

For some video operations, such as trimming videos or detecting silence, FFmpeg should be used. Load the [./references/ffmpeg.md](./references/ffmpeg.md) file for more information.

## Audio visualization

When needing to visualize audio (spectrum bars, waveforms, bass-reactive effects), load the [./references/audio-visualization.md](./references/audio-visualization.md) file for more information.

## How to use

Read individual rule files for detailed explanations and code examples:

- [references/3d.md](references/3d.md) - 3D content in Remotion using Three.js and React Three Fiber
- [references/animations.md](references/animations.md) - Fundamental animation skills for Remotion
- [references/assets.md](references/assets.md) - Importing images, videos, audio, and fonts into Remotion
- [references/audio.md](references/audio.md) - Using audio and sound in Remotion - importing, trimming, volume, speed, pitch
- [references/calculate-metadata.md](references/calculate-metadata.md) - Dynamically set composition duration, dimensions, and props
- [references/can-decode.md](references/can-decode.md) - Check if a video can be decoded by the browser using Mediabunny
- [references/charts.md](references/charts.md) - Chart and data visualization patterns for Remotion (bar, pie, line, stock charts)
- [references/compositions.md](references/compositions.md) - Defining compositions, stills, folders, default props and dynamic metadata
- [references/extract-frames.md](references/extract-frames.md) - Extract frames from videos at specific timestamps using Mediabunny
- [references/fonts.md](references/fonts.md) - Loading Google Fonts and local fonts in Remotion
- [references/get-audio-duration.md](references/get-audio-duration.md) - Getting the duration of an audio file in seconds with Mediabunny
- [references/get-video-dimensions.md](references/get-video-dimensions.md) - Getting the width and height of a video file with Mediabunny
- [references/get-video-duration.md](references/get-video-duration.md) - Getting the duration of a video file in seconds with Mediabunny
- [references/gifs.md](references/gifs.md) - Displaying GIFs synchronized with Remotion's timeline
- [references/images.md](references/images.md) - Embedding images in Remotion using the Img component
- [references/light-leaks.md](references/light-leaks.md) - Light leak overlay effects using @remotion/light-leaks
- [references/lottie.md](references/lottie.md) - Embedding Lottie animations in Remotion
- [references/maps.md](references/maps.md) - Add a map using Mapbox and animate it
- [references/measuring-dom-nodes.md](references/measuring-dom-nodes.md) - Measuring DOM element dimensions in Remotion
- [references/measuring-text.md](references/measuring-text.md) - Measuring text dimensions, fitting text to containers, and checking overflow
- [references/parameters.md](references/parameters.md) - Make a video parametrizable by adding a Zod schema
- [references/sequencing.md](references/sequencing.md) - Sequencing patterns for Remotion - delay, trim, limit duration of items
- [references/tailwind.md](references/tailwind.md) - Using TailwindCSS in Remotion
- [references/text-animations.md](references/text-animations.md) - Typography and text animation patterns for Remotion
- [references/timing.md](references/timing.md) - Interpolation curves in Remotion - linear, easing, spring animations
- [references/transitions.md](references/transitions.md) - Scene transition patterns for Remotion
- [references/transparent-videos.md](references/transparent-videos.md) - Rendering out a video with transparency
- [references/trimming.md](references/trimming.md) - Trimming patterns for Remotion - cut the beginning or end of animations
- [references/videos.md](references/videos.md) - Embedding videos in Remotion - trimming, volume, speed, looping, pitch
<!-- ══════════════════════════════════════════════════════════════════════════
