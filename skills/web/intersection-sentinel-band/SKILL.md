---
name: intersection-sentinel-band
description: |
  Make an IntersectionObserver sentinel a band with real height instead of a 1px point, so a fast scroll cannot step over it. Use when building or fixing infinite scroll, load-more-on-scroll, prefetch-ahead, or any "am I near the end" trigger — especially when it works while scrolling slowly but silently stops firing on a scrollbar drag, fling, or `scrollTo`.
---

# Intersection Sentinel Band

## Rule

A sentinel must have height. `IntersectionObserver` evaluates per frame, so a 1px marker can be
**stepped over**: below the root in one frame, above it in the next, never intersecting in any frame
it was asked about. The trigger just never fires. A scrollbar drag crosses thousands of pixels per
frame, which is exactly where this shows up.

Give the sentinel the look-ahead distance as its own height, and any frame landing anywhere in that
span intersects it. Skipping it now requires crossing the whole band in one frame.

## Pattern

```tsx
const BAND_PX = 2400;

<div
  aria-hidden
  ref={sentinelRef}
  // The negative margin cancels the height, so the band covers the last 2400px of content
  // without adding to the scrollable height. `pointer-events: none` because it now overlaps
  // real content and would otherwise swallow every click under it.
  style={{ height: BAND_PX, marginTop: -BAND_PX, pointerEvents: "none" }}
/>;
```

```ts
new IntersectionObserver(callback, { root, rootMargin: "0px" });
```

## Notes

- **Do not also expand `rootMargin`.** The height _is_ the trigger distance. Keeping both puts the
  same threshold in two places, and a point with a big margin is the failure mode this replaces.
- **Put it in normal flow, after the content.** A flow sibling among absolutely positioned children
  lands at `y=0` — permanently in view at the top of a long list, which fires everything on frame
  one.
- **`isIntersecting` is a state, not an event.** Short content leaves the band visible indefinitely,
  and a band is visible far longer than a point was. Deduplicate on the work ("page N requested"),
  not on "fired once".
- **Measure its `bottom`**, not its `top` — the bottom edge is where rendered content ends.
- **Space it with `margin`, not `padding`.** Padding enlarges the measured box; margin is invisible
  to `getBoundingClientRect`.
- **Repro is a two-frame jump**, not a slow scroll: set `scrollTop` past the band in one step and
  assert the callback still fired.
