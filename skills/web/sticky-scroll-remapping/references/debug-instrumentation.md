# Debug Instrumentation For Scroll Remapping

Use three independent instruments to separate native page movement, remapping
behavior, and DOM geometry. Each instrument answers a different question and
must avoid changing the scene it measures.

## Diagnostic Order

1. Turn on page rulers and leave remapping enabled. Confirm the page continues
   to move naturally while the projected layer decelerates and drifts.
2. Disable scroll mapping without changing any layout. Re-run the same gesture.
   This is the native CSS sticky baseline.
3. Compare enabled and disabled behavior at entry, center, and exit. If the kink
   exists only when enabled, inspect the curve. If it exists in both modes,
   inspect sticky geometry and containment.
4. Turn on page outlines. Locate the section, sticky anchor, inner visual layer,
   and every overflow or transform ancestor.
5. Resize while stopped inside the scene. Repeat the A/B comparison and verify
   that disabling mapping still produces the same native geometry.

Do not turn on every diagnostic at once initially. The tools are most useful as
controlled variables.

## Page Rulers

A page ruler is a document-space texture placed along one or both page edges.
Because it belongs to the full-height page rather than the viewport, its marks
move at native scroll velocity even when the central content is sticky or
visually compensated.

Use it to answer:

- Is native `scrollY` still moving continuously?
- Is the projected content moving slower than the document during drift?
- Did a nested horizontal transform stop while the page continues moving?
- Did resize change the document distance assigned to the scene?

Implementation rules:

- Keep the ruler component layout-free. Let the page position and size it.
- Mount it as an absolute full-height child of the document-level page root.
- Use `pointer-events: none` and an appropriate debug-only stacking layer.
- Prefer a repeated SVG mask or background over hundreds of DOM tick nodes.
- Vary major and minor tick lengths, widths, and opacity. A perfectly uniform
  high-frequency pattern produces visual strobing during fast scrolling.
- Add sparse labels only when absolute scroll distance matters.
- Do not use `position: fixed`; fixed marks do not expose document movement.

The example in [`page-ruler.tsx`](../examples/debug-instrumentation/page-ruler.tsx)
uses a 512px repeating mask with one major and several unequal minor ticks.

## Disable Scroll Mapping

This control creates the most important A/B comparison. Disabled mode must be
the exact same DOM and layout with only remapped projection removed.

```tsx
const compensationY = useTransform(() => {
  if (!remappingEnabled || prefersReducedMotion) return 0;

  return nativeDisplacement.get() - targetDisplacement.get();
});
```

Preserve all of the following while disabled:

- section height and padding;
- sticky anchor and offsets;
- content dimensions;
- overflow and containing blocks;
- scroll listeners or Motion values used only for telemetry.

Do not conditionally unmount the remapped scene, remove `position: sticky`, or
collapse synthetic track height. Those changes create a different experiment.

If the scene drives multiple projections, such as vertical compensation and a
horizontal card rail, gate every tested projection with the same flag:

```tsx
const x = useTransform(() => remappingEnabled ? mapHorizontalProgress(progress.get()) : 0);
```

Keep telemetry active in both modes. A useful readout shows native velocity,
target velocity, compensation, and whether the baseline flag is active.

## Page Outlines

A global outline overlay reveals the actual DOM boxes without participating in
layout. It is useful for finding:

- the real sticky containing block;
- wrappers with unexpected height or padding;
- overflow clipping;
- transformed ancestors that change containing-block behavior;
- pseudo-elements that visually extend beyond their owner;
- content whose intrinsic size changed after fonts or media loaded.

Use `outline`, not `border`. A border changes the border box and can alter the
very measurements under investigation. A small negative `outline-offset` keeps
the stroke inside the box and reduces clipping at page edges.

```css
body[data-scroll-debug-outline] *,
body[data-scroll-debug-outline] *::before,
body[data-scroll-debug-outline] *::after {
  outline: 1px solid rgb(255 0 100 / 25%) !important;
  outline-offset: -1px !important;
}
```

Inject one style element and toggle a body data attribute. Do not mutate every
element's inline style; that is slow, difficult to clean up, and can overwrite
application styles.

Outlines show border-box boundaries, not margins or collapsed-margin regions.
Use browser box-model inspection when margin behavior remains ambiguous.

## Wiring The Tools

Keep the panel state low-frequency React state. Only the actual scroll path
belongs in Motion values. A render-prop harness can expose the three flags:

```tsx
<ScrollDebugHarness>
  {({ remappingEnabled }) => <StickyScene remappingEnabled={remappingEnabled} />}
</ScrollDebugHarness>;
```

Mount rulers at page scope:

```tsx
<main className="debug-page-root">
  {showRulers
    ? (
      <>
        <PageRuler className="debug-page-ruler debug-page-ruler-left" side="left" />
        <PageRuler className="debug-page-ruler debug-page-ruler-right" side="right" />
      </>
    )
    : null}
  {children}
</main>;
```

The complete copyable example is under
[`examples/debug-instrumentation/`](../examples/debug-instrumentation/).

## Production Boundary

Treat these as development and preview instrumentation. Remove them from the
production bundle when practical, or gate activation so production users cannot
enable the tools accidentally. Persisting preferences is fine, but namespace
the storage key to the page or feature being debugged.
