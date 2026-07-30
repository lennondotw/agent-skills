# Lenis-Synchronized Sticky Remapping

Use this reference when a `position: sticky` scene uses a JS transform to compensate native sticky
movement and the page also uses Lenis or another smooth-scroll driver.

## Core Rule

The sticky anchor and the compensation transform must be driven from one scroll frame. CSS sticky is
resolved by the browser from the current scroll position. If the JS transform is computed or committed
from a later observer, the inner layer visually corrects one frame late.

When Lenis is active, Lenis is the usable synchronization point:

```ts
let rafId = window.requestAnimationFrame(function raf(time) {
  lenis.raf(time);
  syncStickyRemapping(window.scrollY, time);
  rafId = window.requestAnimationFrame(raf);
});
```

The remap subscriber should use cached geometry and write the transform synchronously:

```ts
const syncStickyRemapping = () => {
  const progress = getProgressFromScrollY(window.scrollY, cachedGeometry);
  const y = getStickyCompensation(progress, cachedGeometry);

  layer.style.transform = `translate3d(0, ${y}px, 0)`;
};
```

React state, native `scroll` events, `useScroll`, `useTransform`, and framework render commits are not
safe enough for this compensation path when the transform must cancel CSS sticky's native movement.
They may observe the right `scrollY` but still commit the DOM transform in the next frame.

## Disable Without A Synchronized Driver

Do not enable sticky remapping when Lenis or an equivalent single scroll driver is unavailable,
disabled, or intentionally skipped for `prefers-reduced-motion`.

Fallbacks should be:

- native sticky with no compensation transform;
- a static responsive layout;
- a simpler scroll-linked effect that does not need to cancel native sticky displacement.

Without a synchronized driver, CSS sticky and JS transform operate on separate timing paths. Fast wheel
input can make the transform lag, and JS can also miss frames under load. A smoother mathematical curve
does not repair that timing mismatch.

## Diagnosing One-Frame Lag

The failure usually looks like a curve problem at first: a word or card reverses direction for one
frame near sticky entry or exit. Prove timing before retuning the curve.

Measure these values in the same browser frame:

- `window.scrollY`;
- sticky anchor rect;
- transformed layer rect;
- concrete text range rect, such as the first visible word;
- actual `translateY` from computed style;
- expected `translateY` from the remapping formula evaluated at current `scrollY`.

If `actualY` matches `expectedY` from the previous sample instead of the current sample, the math is
not the defect. The transform writer is late.

Use real wheel input for reproduction:

- dispatch `mouseWheel` through browser automation or manually use the wheel;
- sample at requestAnimationFrame cadence;
- test a fast delta as well as a slow delta;
- avoid relying only on `scrollTo`, because it does not reproduce the same event and smoothing path.

## Today AI Landing Lesson

On the Today landing "learns your day" section, the remapping curve was continuous and correct, but
the Motion pipeline committed the compensation transform one frame after CSS sticky had already used
the current scroll position. A fast wheel sample showed the computed `expectedY` jump to the new value
while the DOM transform still held the previous value; the next frame caught up and produced the
visible shake.

The fix was to publish a landing Lenis frame after `lenis.raf(time)`, have the remap component listen
to that frame, compute from cached geometry and current `window.scrollY`, and write
`layer.style.transform` synchronously. The page also gates remapping on Lenis being active, so disabling
Lenis or enabling reduced motion returns to native/static behavior instead of running a lag-prone
projection.
