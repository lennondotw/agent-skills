---
name: seamless-hit-target
description: Design seamless interactive hit targets while preserving visual size and focus outline geometry. Use when small controls, split row actions, adjacent buttons, tree rows, menu rows, resizers, or icon controls need larger clickable areas without changing their visible dimensions, keyboard focus outline, spacing, or layout.
---

# Seamless Hit Target

Use this when the visible affordance must keep its exact physical size, but the interactive area needs to be larger and continuous with neighboring targets.

## Principle

Separate three boxes:

- **Visual box**: the pixels the user sees.
- **Focus box**: the element geometry that receives keyboard focus and draws `:focus-visible`.
- **Hit box**: an invisible layer that can extend beyond the visual/focus box.

Do not enlarge the real button just to improve pointer access. Physical size affects focus outlines, layout, alignment, and perceived component size. Keep the real element sized to the design; expand only an absolute child or pseudo-element.

## Pattern

```tsx
<button className="relative size-6 rounded-md focus-visible:ring-2">
  <span className="absolute -left-1 -right-2 -top-1.5 -bottom-1.5" />
  <Icon className="relative size-4" />
</button>
```

The button remains `24x24`, so keyboard focus is correct. The hit layer is larger and can extend asymmetrically.

## Seamless Adjacent Targets

When controls are separated by a visual gap, split the gap between their hit boxes so there is no dead zone.

```tsx
<div className="flex gap-3">
  <button className="relative size-6">
    <span className="absolute -right-1.5 inset-y-0" />
    <ChevronIcon />
  </button>

  <button className="relative h-10 flex-1">
    <span className="absolute -left-1.5 -right-1.5 -top-1 -bottom-1" />
    <span className="relative truncate">Marketing Reports</span>
  </button>

  <button className="relative size-8">
    <span className="absolute -left-1.5 -right-1 -top-1 -bottom-1" />
    <MoreIcon />
  </button>
</div>
```

If the visual gap is `12px`, each neighboring target usually expands `6px` into it. If one side owns the interaction, give that side more of the gap deliberately.

## Hover Overlay

Keep the visible hover/focus overlay sized to the visual box unless the design says otherwise. The hit layer can be larger than the overlay.

```tsx
<button className="group relative size-8 rounded-lg">
  <span className="absolute -right-1 -top-2 -bottom-2 left-0" />
  <span className="pointer-events-none absolute inset-0 rounded-lg bg-black/5 opacity-0 group-hover:opacity-100" />
  <MoreIcon className="relative" />
</button>
```

## Checklist

- Keep the focusable element's physical size equal to the designed visual size.
- Expand hit areas with absolute children or `::before`; do not use extra padding that changes layout.
- Split visual gaps so adjacent hit boxes meet edge-to-edge.
- Use asymmetric expansion when only one side needs extra reach.
- Keep hover overlays above content, `pointer-events-none`, and visually sized independently from the hit box.
- Watch parent `overflow: hidden`; it clips expanded hit layers.
