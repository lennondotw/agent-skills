# Today Landing Calibration Example

This example records one calibrated profile from the Today landing page. It is evidence for a useful
tuning range, not a default every product should inherit.

## Sticky Text Scene

The “Today learns…” section uses:

```ts
const driftVelocity = 0.16;
const transitionViewportRatio = 0.75;
const transitionLowRegionRatio = 0.68;
```

The initial profile used `0.08 / 0.65 / 0.60`. Product review asked for approximately twice as much
center drift and slightly softer entry and exit, producing the current values above.

Large-screen geometry:

```text
outer track height: 200dvh
content canvas height: 1068px
visual top compensation: 256px
section block padding: 60px top and bottom
sticky minimum height: 1068 + 256 + 120 = 1444px
actual top padding: 256 + 60 = 316px
actual bottom padding: 60px
```

The sticky surface remains `100dvh` when the viewport is tall enough and grows to its `1444px`
minimum when content requires it. The outer track remains responsible for the two-viewport input
distance.

Reference test geometry:

```ts
const geometry = {
  sectionHeight: 2880,
  stickyHeight: 1440,
  viewportHeight: 1440,
};
```

Expected numerical properties:

- target displacement at progress `0`: `0`;
- target displacement at progress `0.5`: `1440`;
- target displacement at progress `1`: `2880`;
- velocity near progress `0.1`: `1`;
- velocity at progress `0.5`: `0.16`;
- velocity near progress `0.9`: `1`;
- compensation at both endpoints: `0`.

## Proactive Horizontal Scene

The “It helps before you ask” section reuses the same vertical compensation profile, but its pinned
distance is responsive horizontal overflow:

```ts
const contentWidth = 1350;
const paddingInline = "max(45px, calc((100vw - 1350px) / 2))";
const travel = Math.max(0, contentWidth - availableWidth);

sectionHeight = viewportHeight + travel;
```

Current authored content consists of three `430px` cards with two `30px` gaps:

```text
3 * 430 + 2 * 30 = 1350px
```

At viewport widths of `1440px` and above, the available content width is `1350px`, so travel becomes
zero. The section collapses to one viewport and both remaps become no-ops. At `1200px`, available width
is `1110px`, travel is `240px`, and a `900px` viewport produces a `1140px` section.

Horizontal easing uses:

```ts
const horizontalScrollEasingEmphasis = 0.6;
```

This blends ordinary quintic smootherstep with a second application of the same curve. It makes the
start and end easing easier to perceive while preserving progress `0`, `0.5`, and `1` exactly.

## What To Copy And What Not To Copy

Copy:

- native sticky plus inner compensation;
- endpoint-preserving area conservation;
- MotionValue-only hot path;
- responsive no-overflow no-op;
- independent horizontal easing;
- numerical velocity and resize verification.

Recalibrate:

- drift velocity;
- transition allocation;
- sticky minimum height;
- section padding and visual centering offset;
- horizontal easing emphasis;
- mobile behavior and reduced-motion policy.
