---
name: web-layout-best-practices
description: |
  Concise Web layout rules for normal flow, Flexbox, Grid, centering, sizing, spacing, overflow, and responsive composition. Use whenever building or reviewing Web UI layout, especially when positioning elements, centering content, choosing between normal flow and absolute positioning, or fixing brittle Tailwind CSS layouts.
---

# Web Layout Best Practices

- Prefer normal flow; reserve absolute positioning for overlays and intentional overlap.
- Center with Flexbox, Grid, or `mx-auto`; avoid `left-1/2` plus `-translate-x-1/2`.
- Use transforms for visual effects and motion, not static layout.
- Let parents own placement and available inline size.
- Let components own internal spacing and intrinsic block size.
- Use `gap` for sibling spacing; avoid positional margins between siblings.
- Declare `flex` or `grid` on elements whose job is arranging children.
- Add `min-w-0` where flex or grid children must shrink or truncate.
- Add `shrink-0` where controls or icons must keep their size.
- Use `max-width`, `min-width`, and `aspect-ratio` for stable responsive bounds.
- Reserve space for dynamic content to prevent layout shift.
- Verify layout at narrow, default, and wide container sizes.
