---
name: web-layout-best-practices
description: |
  Web and Storybook layout centering guidance. Use when centering UI elements, reviewing positioning code, or composing Storybook hosts and decorators.
---

# Web Layout Best Practices

- Center with Flexbox, Grid, or `mx-auto`; transforms do not participate in layout, so avoid `left-1/2` plus `-translate-x-1/2`.
- Prefer Storybook `fullscreen`; use a `min-h-screen w-full` Flexbox decorator with `items-center justify-center`, adding `max-w-* mx-auto` when needed.
