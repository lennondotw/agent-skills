---
name: sticky-scroll-remapping
description: >-
  Design, implement, tune, and debug smooth scroll remapping for pinned position: sticky sections.
  Use this whenever a sticky scene visibly snaps into or out of its pinned phase, has a hard velocity
  corner, needs a slow center drift, maps vertical scroll into horizontal travel, or feels like scroll
  jacking even though native scrolling is still in control. Also use it when implementing compensation
  transforms, piecewise velocity curves, smoothstep or smootherstep scroll easing, MotionValue-driven
  scroll scenes, responsive pinned distances, or wide-screen no-op behavior.
---

# Sticky Scroll Remapping

Use native document scrolling and CSS sticky for layout, then replace only the sticky element's
visual position curve with a compensating transform. This produces gradual deceleration, a controlled
center drift, and gradual acceleration without intercepting wheel or touch input.

## Load The Right Reference

- Read [references/math-model.md](references/math-model.md) before changing curve shape,
  continuity order, drift velocity, or endpoint constraints.
- Read [references/motion-react.md](references/motion-react.md) before implementing this with
  Motion, `MotionValue`, `useScroll`, `useTransform`, `useAnimationFrame`, or responsive measurement.
- Read [references/today-calibration.md](references/today-calibration.md) when a concrete calibrated
  example is useful. Treat its values as a starting profile, not universal constants.
- Read [references/debug-instrumentation.md](references/debug-instrumentation.md) when the motion is
  hard to judge by eye, when native and remapped geometry need an A/B baseline, or when overflow and
  containment may be causing an apparent motion defect.

## First Distinguish The Interaction

Call a CSS-sticky scene a **pinned scroll-linked section**, not scroll jacking, when:

- the browser still owns `scrollY`;
- wheel and touch events are not prevented or rewritten;
- the layout uses `position: sticky`;
- transforms are a visual projection of native scroll progress.

It becomes scroll jacking when code intercepts input, forces scroll positions, or replaces the
browser's distance and momentum model. Do not introduce those mechanisms to solve a sticky kink.

## Why Native Sticky Has A Hard Corner

The sticky element has three native velocity phases relative to the viewport:

1. Entry: it moves with the document at velocity `1`.
2. Pinned plateau: it stays fixed at velocity `0`.
3. Exit: it moves with the document again at velocity `1`.

Position remains continuous, but velocity changes instantaneously at `1 -> 0` and `0 -> 1`. The
visible "尖点" is more precisely a **kink** or **first-derivative discontinuity**, not a positional
jump. A spring added after the fact usually creates lag and hysteresis; solve the position mapping
itself first.

## Implementation Spine

### 1. Preserve Native Geometry

Use this structure:

```tsx
<section className="relative" ref={trackRef}>
  <div className="sticky top-0 h-dvh" ref={stickyRef}>
    <motion.div style={{ y: compensationY }}>{children}</motion.div>
  </div>
</section>;
```

The outer section owns scroll distance. The sticky node remains the native layout anchor. Apply the
compensation only to an inner visual layer so CSS sticky continues to determine containment and exit.

### 2. Measure The Real Geometry

Track these values outside React state:

- absolute section top;
- section height;
- sticky border-box height;
- viewport height;
- any responsive horizontal overflow distance.

Use `ResizeObserver` for content geometry and a viewport-size guard for window changes. Recalculate
derived scroll distance after padding, fonts, images, and responsive layout settle.

### 3. Define The Native And Target Curves

Model native sticky displacement as a piecewise `1 -> 0 -> 1` velocity profile. Define a target
velocity profile with:

- a leading full-speed region;
- a smooth transition from `1` to drift velocity;
- a non-zero drift plateau;
- a smooth transition from drift velocity back to `1`;
- a trailing full-speed region.

Integrate velocity to obtain target displacement. Preserve the total area under the velocity curve,
otherwise the remapped element will not meet native layout at both endpoints.

### 4. Apply Compensation, Not Absolute Positioning

```ts
compensation = nativeDisplacement - targetDisplacement;
```

Apply that difference as `translateY`. Compensation must be zero at the first and last progress
values. This lets the remapped projection join native layout without accumulated offset.

### 5. Keep Drift Non-Zero

A true stationary plateau recreates the hard pinned feeling. Use a small positive **target velocity**.
Drift is the derivative of target displacement with respect to input scroll distance, not the
amplitude of the compensation transform. During the drift interval, target displacement must remain
monotonic and advance by approximately `driftVelocity * inputDistance`.

Tune drift independently from transition length:

- increase drift velocity when the middle feels frozen;
- increase transition distance when entry or exit still feels abrupt;
- do not change both blindly, because endpoint area must remain conserved.

Do not fake drift with a periodic position offset such as `sin`, `sin^2`, or a symmetric bump. Those
curves can keep compensation non-zero while their center velocity returns to zero or reverses sign.
Verify drift by sampling visual position on both sides of the midpoint and measuring its slope.

### 6. Reject Or Constrain Infeasible Parameters

The extra distance introduced by drift must fit inside the native leading and trailing movement.
Before constructing transitions:

- compute the distance consumed by drift recovery;
- ensure it is smaller than the combined outer distance;
- cap transition distance to the outer distance still available after drift recovery;
- clamp or reject drift when no positive outer interval remains.

Do not rely on `Math.max(0, outerScale)` alone. It hides an impossible profile and can create a
displacement mismatch or an endpoint jump.

### 7. Smooth Nested Progress Separately

If vertical scroll also drives horizontal cards, do not reuse the compensation value as horizontal
progress. Derive a separate normalized progress over the actual horizontal travel interval, then map
it with smoothstep or smootherstep.

Preserve responsive behavior:

```ts
travel = Math.max(0, contentWidth - availableWidth);
sectionHeight = viewportHeight + travel;
```

When `travel === 0`, collapse the section back to one viewport and let both vertical compensation and
horizontal mapping become no-ops. Do not invent a minimum pinned distance unless the product explicitly
requires dwell time even when all content fits.

### 8. Keep The Hot Path In Motion Values

Use `useScroll -> useTransform -> motion style`. Do not mirror per-frame progress into React state.
Use function-form `useTransform` when several measured MotionValues contribute to one result; its
dependencies are collected automatically.

Use `useAnimationFrame` for procedural updates or a cheap viewport-size guard. Do not perform layout
reads every frame when the geometry has not changed.

## Choosing Smoothness Order

Use the lowest order that removes the visible discontinuity:

| Mapping                     | Endpoint property                                            | Typical result                                             |
| --------------------------- | ------------------------------------------------------------ | ---------------------------------------------------------- |
| Linear segment              | Position only                                                | Visible velocity corner                                    |
| Cubic smoothstep            | Zero endpoint velocity                                       | Smooth position, acceleration can still change abruptly    |
| Quintic smootherstep        | Zero endpoint velocity and acceleration                      | Better for direct scroll-linked position                   |
| Integrated quintic velocity | Continuous velocity and acceleration in the velocity profile | Best for replacing sticky's `1 -> 0 -> 1` velocity corners |

For a nested horizontal list, direct quintic smootherstep is usually sufficient. If easing is hard to
perceive, blend standard smootherstep with a second application of itself rather than changing travel.

## Tuning Order

Tune in this order so each change has one interpretation:

1. Prove native geometry and endpoints.
2. Set drift to zero and remove the entry/exit kink.
3. Add a small drift velocity.
4. Prove the requested drift and transition distances are feasible.
5. Adjust transition allocation.
6. Tune nested horizontal easing.
7. Verify wide-screen no-op and narrow-screen overflow behavior.
8. Verify resize while inside the section.

## Required Verification

- Sample displacement and numerical velocity across the entire curve.
- Assert compensation is zero at progress `0` and `1`.
- Assert target displacement reaches the same endpoint as native sticky.
- Assert target displacement remains monotonic through the drift interval.
- Estimate midpoint visual velocity from samples immediately before and after the midpoint.
- Check maximum adjacent velocity jump near every piecewise boundary.
- Test sticky height equal to, shorter than, and taller than the viewport.
- Test a width with horizontal overflow and one where content fits exactly.
- Resize while the section is active and confirm scroll distance recomputes.
- Check `prefers-reduced-motion`; normally return native sticky with no compensation.
- Inspect the real page with visible rulers or fixed page marks so native displacement remains legible.

## Use A Non-Invasive Debug Triad

When tuning by eye, enable these tools independently:

1. **Page rulers:** document-scoped edge marks make native page displacement visible behind a sticky
   or compensated layer. Use an irregular major/minor pattern to avoid a visually noisy strobe.
2. **Disable scroll remapping:** return every compensation and nested remapped transform to its native
   value while preserving the exact section height, sticky anchor, content, and viewport. This is the
   control condition for deciding whether the defect belongs to native geometry or the remap.
3. **Page outlines:** apply non-layout-affecting outlines to every element and pseudo-element to reveal
   the actual boxes, overflow, sticky containing block, and unexpected wrappers.

Keep all three tools outside the measured layout. Do not use borders for the global overlay, do not
make the ruler `position: fixed`, and do not unmount or resize the sticky scene when remapping is
disabled. See the reference and the copyable files under
[`examples/debug-instrumentation/`](examples/debug-instrumentation/).

Run the bundled sampler while tuning:

```bash
node scripts/sample-profile.mjs \
  --section-height 2880 \
  --sticky-height 1440 \
  --viewport-height 1440 \
  --drift 0.16 \
  --transition-viewport-ratio 0.75 \
  --transition-low-region-ratio 0.68
```

## Failure Patterns

- **Transforming the sticky anchor itself:** changes the coordinate relationship CSS sticky is using.
- **Using `fixed` immediately:** discards native containment and requires rebuilding entry, exit, and
  resize behavior.
- **Springing raw scroll progress:** introduces temporal lag; the same scroll position can render at
  different visual positions depending on prior motion.
- **Using a sinusoidal compensation bump as drift:** makes the visual layer slow to zero and often
  reverse direction instead of advancing at a small positive target velocity.
- **Clamping an invalid outer scale to zero:** hides an infeasible drift/transition allocation rather
  than preserving the endpoint integral.
- **Clamping too early:** prevents negative pre-entry or greater-than-one post-exit progress when an
  effect needs fully correct initial and final states.
- **Adding fake scroll distance:** breaks responsive no-op behavior when content already fits.
- **Updating React state on scroll:** adds reconciliation to a 60 Hz path and makes stutter more likely.
- **Ignoring measurement timing:** stale padding or container width creates incorrect travel after
  resize.
