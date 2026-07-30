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
content-driven track height: measured content height + 2000px normal-flow spacer sibling
sticky top: max(0, (viewport height - measured content height) / 2)
section block padding: 60px top and bottom on the sticky content wrapper
```

The sticky content remains in normal document flow, so the scene enters immediately after the
previous section instead of reserving a blank viewport-sized frame. The computed sticky `top` centers
the content while it is pinned when the viewport is tall enough; if the content is taller than the
viewport, `top` resolves to `0`. The extra scroll distance is a sibling spacer after the sticky
anchor, not section bottom padding, so it expands the section height without changing the sticky
anchor's own box or the section padding edge.

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

sectionHeight = measuredSectionContentHeight + travel * travelHeightFactor;
stickyTop = Math.max(0, (viewportHeight - measuredSectionContentHeight) / 2);
```

Current authored content consists of three `430px` cards with two `30px` gaps:

```text
3 * 430 + 2 * 30 = 1350px
```

At viewport widths where the available content width is at least `1350px`, travel becomes zero. The
section collapses to its content height and both remaps become no-ops. At narrower widths, the extra
scroll distance is driven by horizontal overflow rather than by `vh` or `dvh`.

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
