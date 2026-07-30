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
- Read [references/lenis-synchronized-remapping.md](references/lenis-synchronized-remapping.md)
  before combining CSS sticky with a JS compensation transform on a page that uses Lenis, smooth
  scrolling, or any non-native scroll driver.
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
  <div className="sticky top-0 h-dvh overflow-visible" ref={stickyRef}>
    <motion.div style={{ y: compensationY }}>
      <div className="overflow-hidden">{children}</div>
    </motion.div>
  </div>
</section>;
```

The outer section owns scroll distance. The sticky node remains the native layout anchor. Apply the
compensation only to an inner visual layer so CSS sticky continues to determine containment and exit.
Keep the sticky anchor `overflow-visible` by default. The compensation transform can move the inner
visual layer outside the sticky anchor's border box, so clipping on the anchor can cut off content
during entry, center drift, or exit. Put clipping on the actual viewport, card, mask, or media layer
inside the transformed content instead. Only clip on the sticky anchor when that anchor is explicitly
intended to be the clip root and the remap amplitude has been included in its measured height.

### 2. Choose The Track Layout Strategy

Pick the scroll track geometry deliberately. There are two common layouts:

1. **Document-flow-first sticky:** let the sticky content keep its natural block size in the normal
   document flow. Compute `top = max(0, (viewportHeight - contentHeight) / 2)` from measured content
   height, then apply that value to the sticky anchor. This keeps the scene tightly attached to the
   previous section while still pinning near visual center after it enters. If content is taller than
   the viewport, `top` becomes `0` and the scene avoids centering overflow.
2. **Viewport-frame sticky:** wrap content in a `100vh` or `100dvh` frame and center inside that
   frame. This guarantees a full-screen entry with intentional whitespace above and below the content,
   but it can show a long blank approach on tall screens and can clip or overflow when content is
   taller than the viewport.

For pinned marketing/story sections, prefer the document-flow-first strategy when adjacent sections
should feel naturally connected. Use the viewport-frame strategy only when the full-screen entrance is
part of the intended composition.

Use `vh` for an authored viewport-sized scroll track when the browser chrome should not change the
timeline length during interaction. Use `dvh` for a visible viewport-sized surface that should follow
dynamic browser chrome. Do not use either unit when the desired scroll-driven timeline distance is a
fixed authored amount; instead derive the track height from measured content height plus a fixed
extra distance, for example:

```ts
trackHeight = contentHeight + fixedScrollDistance;
```

When the sticky child stays in flow, prefer a normal-flow spacer sibling over a large
`padding-block-end` on the section. A large section padding can change the sticky containing block's
padding edge and make sticky behavior appear to stop early or fail. Keep the sticky anchor's own box
clean and let the spacer provide only scroll distance:

```tsx
<section className="relative">
  <div className="sticky" style={{ top }}>
    {children}
  </div>
  <div aria-hidden className="pointer-events-none h-[2000px]" />
</section>
```

### 3. Measure The Real Geometry

Track these values outside React state:

- absolute section top;
- section height;
- sticky border-box height;
- viewport height;
- any responsive horizontal overflow distance.

Use `ResizeObserver` for content geometry and a viewport-size guard for window changes. Recalculate
derived scroll distance after padding, fonts, images, and responsive layout settle.

### 4. Define The Native And Target Curves

Model native sticky displacement as a piecewise `1 -> 0 -> 1` velocity profile. Define a target
velocity profile with:

- a leading full-speed region;
- a smooth transition from `1` to drift velocity;
- a non-zero drift plateau;
- a smooth transition from drift velocity back to `1`;
- a trailing full-speed region.

Integrate velocity to obtain target displacement. Preserve the total area under the velocity curve,
otherwise the remapped element will not meet native layout at both endpoints.

### 5. Apply Compensation, Not Absolute Positioning

```ts
compensation = nativeDisplacement - targetDisplacement;
```

Apply that difference as `translateY`. Compensation must be zero at the first and last progress
values. This lets the remapped projection join native layout without accumulated offset.

### 6. Keep Drift Non-Zero

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

### 7. Reject Or Constrain Infeasible Parameters

The extra distance introduced by drift must fit inside the native leading and trailing movement.
Before constructing transitions:

- compute the distance consumed by drift recovery;
- ensure it is smaller than the combined outer distance;
- cap transition distance to the outer distance still available after drift recovery;
- clamp or reject drift when no positive outer interval remains.

Do not rely on `Math.max(0, outerScale)` alone. It hides an impossible profile and can create a
displacement mismatch or an endpoint jump.

### 8. Smooth Nested Progress Separately

If vertical scroll also drives horizontal cards, do not reuse the compensation value as horizontal
progress. Derive a separate normalized progress over the actual horizontal travel interval, then map
it with smoothstep or smootherstep.

Preserve responsive behavior:

```ts
travel = Math.max(0, contentWidth - availableWidth);
sectionHeight = contentHeight + travel;
```

When `travel === 0`, collapse the section back to its content height and let both vertical
compensation and horizontal mapping become no-ops. Do not invent a minimum pinned distance unless the
product explicitly requires dwell time even when all content fits.

### 9. Keep The Hot Path In One Scroll Driver

The native sticky position and the compensation transform must be updated from the same scroll
snapshot before paint. If the page has Lenis, run the remap from Lenis' own RAF after
`lenis.raf(time)` and write the transform synchronously in that same callback chain.

Do not rely on a second scroll observer, native `scroll` listener, `useScroll`, or MotionValue render
commit for compensation that must cancel CSS sticky's native displacement. Those paths can be one
frame behind the sticky layout during fast wheel input, which shows up as a visible correction at
entry or exit.

When no single JS scroll driver can synchronize the transform with sticky layout, do not enable this
remapping. Return native sticky or a static layout instead. A compensation transform that lags the
browser's sticky calculation will jitter by design; making the curve smoother cannot fix that timing
defect.

Do not mirror per-frame progress into React state. Keep geometry in refs or external values, and keep
layout reads out of the scroll frame unless geometry actually changed.

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
- In a real browser, sample a concrete text range or layer rect at 60 fps while dispatching wheel
  input. Compare the actual transform against the curve evaluated at current `scrollY`; if it matches
  the previous sample instead, the transform write is one frame late.
- Verify fast wheel input, not only slow trackpad or scripted `scrollTo`. Slow gestures can hide a
  one-frame lag.

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
- **Clipping on the sticky anchor:** cuts off the compensated inner layer when `translateY` moves it
  outside the sticky anchor. Keep the sticky anchor `overflow-visible`; clip on a deeper viewport,
  card, mask, or media element instead.
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
- **Computing in the right frame but committing in the next one:** a MotionValue or framework render
  path can receive the current scroll position yet still apply the DOM transform one frame later.
  For sticky compensation, write the transform synchronously from the active scroll driver's frame.
- **Running remap without Lenis or another synchronized driver:** CSS sticky and JS transform updates
  are not guaranteed to share a frame. Disable the remap when the driver is unavailable, disabled, or
  reduced-motion has turned it off.
- **Ignoring measurement timing:** stale padding or container width creates incorrect travel after
  resize.
