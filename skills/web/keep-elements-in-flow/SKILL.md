---
name: keep-elements-in-flow
description: |
  Keep UI elements in normal flow for resilient, content-driven layouts. Use when building or reviewing overlapping cards, preview stacks, localized actions, responsive surfaces, or code with many fixed dimensions and absolutely positioned children. Prefer Flexbox, Grid, relative positioning, negative margins, and content-driven sizing; keep absolute positioning for true overlays that should not reserve layout space.
---

# Keep Elements In Flow

## Rule

Keep elements in normal flow whenever their size or position should influence surrounding content.
Use `relative` positioning and negative margins for in-flow overlap. Use `absolute` only when an
element is intentionally independent of the layout and should not reserve space.

This is a default, not an absolute ban on fixed dimensions or absolute positioning.

## Why

In-flow layouts let the browser perform the layout work:

- Parent height follows content automatically.
- Siblings move when text wraps or content changes.
- Buttons can grow for larger fonts and translated labels.
- Flexbox and Grid preserve alignment across container widths.
- DevTools exposes a clear box model instead of a collection of unrelated coordinates.

An absolute child is removed from normal flow. Its parent and siblings behave as if it does not
exist, so the author must manually reserve space, maintain offsets, and handle content growth.

## Minimal Comparison

Avoid turning a content-driven surface into a coordinate canvas:

```tsx
// Brittle: the parent height, preview position, and action width are all manually coordinated.
<section className="relative h-64">
  <header className="absolute inset-x-0 top-5 text-center">...</header>
  <div className="absolute inset-x-0 top-20 flex justify-center">...</div>
  <button className="absolute bottom-5 left-1/2 w-28 -translate-x-1/2">Action</button>
</section>;
```

Let content establish the geometry and use layout-aware overlap:

```tsx
<section className="relative py-5">
  <header className="text-center">...</header>

  <div className="flex items-center justify-center pt-8">
    <Preview className="relative z-10 -mr-3" />
    <Preview className="relative z-20" />
    <Preview className="relative z-30 -ml-3" />
  </div>

  <button className="relative z-40 mx-auto -mt-7 block h-7 px-4">Action</button>

  <button className="absolute top-3 right-3" aria-label="Dismiss">
    <IconX />
  </button>
</section>;
```

The action remains in flow. Its negative top margin creates the overlap, its fixed height preserves
the control contract, and horizontal padding lets its width adapt to text. The dismiss button stays
absolute because it is a true corner overlay and should not create a separate layout row.

## What Participates In Layout

| Technique                           | Reserves or changes layout space | Typical use                                        |
| ----------------------------------- | -------------------------------- | -------------------------------------------------- |
| Normal flow, Flexbox, Grid          | Yes                              | Primary composition                                |
| Width, height, padding, gap, margin | Yes                              | Box sizing and spacing                             |
| Negative margin                     | Yes                              | Pull in-flow elements into overlap                 |
| CSS `zoom`                          | Yes                              | Scale previews when scaled size must affect layout |
| `position: relative`                | Keeps the original box in flow   | Stacking and small visual offsets                  |
| `position: absolute` or `fixed`     | No                               | True overlays and viewport layers                  |
| `transform`                         | No                               | Rotation, animation, and visual-only movement      |

`position: relative` preserves the element's original layout slot. A relative `top` or `left` offset
changes only where it paints, so prefer margins or layout primitives when siblings must react to the
movement.

## Fixed And Adaptive Dimensions

Choose fixed dimensions only when they are part of the component contract.

- Buttons usually use a fixed `h-*` and horizontal `px-*`; width follows content.
- Text containers usually adapt in both axes within deliberate min/max bounds.
- Icons, avatars, media frames, and calibrated preview tiles may use fixed dimensions.
- Fixed button width is appropriate only when equal-width controls are a real requirement.
- Adaptive button height is an exception for intentionally wrapping or multi-line actions.

Account for larger font settings, localization, optional content, and narrow containers before
writing a fixed `w-*` or parent `h-*`.

## When Absolute Is Correct

Use absolute positioning when the element should not influence surrounding geometry:

- A dismiss button pinned to a card corner.
- A badge attached to another element.
- A tooltip, popover, menu, or modal layer.
- Decorative artwork or a non-interactive visual layer.
- A viewport-fixed control.

Give the containing block `relative`, and reserve any required safe area in the in-flow content so
the overlay does not cover text or controls.

## Review Questions

1. Should this element reserve space in its parent?
2. Should siblings move when its content grows or wraps?
3. Can Flexbox, Grid, `gap`, `mx-auto`, or padding express the relationship?
4. Can `relative` plus a negative margin create the overlap while preserving flow?
5. Is a fixed width or height a real component contract or an unexamined coordinate?
6. Is the absolute element a true overlay that should remain independent of content?

If the first two answers are yes, keep the element in flow.
