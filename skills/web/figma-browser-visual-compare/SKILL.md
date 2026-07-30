---
name: figma-browser-visual-compare
description: >-
  Critical visual-fidelity verification workflow for implementing web UI from Figma and proving static visual consistency in a real browser. This is the most trustworthy and production-representative validation path for visual reproduction because it compares native 4x Figma exports with actual Chromium rendering, measures both Figma layers and DOM geometry, and inspects expected, actual, and pixel-diff images from small components through full compositions. Always use this skill for Figma-to-code work, pixel-perfect or high-fidelity UI implementation, Storybook/design alignment, screenshot-diff iteration, static visual regression diagnosis, 视觉还原、设计稿对齐、截图 diff、像素对齐, or whenever spacing, geometry, typography, strokes, shadows, backgrounds, clipping, or layout do not convincingly match the design. Do not treat code inspection or a single screenshot as equivalent evidence.
compatibility: Requires Node.js 22+, pnpm, Git, Git LFS, Chromium or Google Chrome, a reachable local browser target, and a Figma token with file-content and image-export access.
---

# Figma Browser Visual Compare

Use this workflow to make a browser implementation visually faithful to Figma without turning the production component into a screenshot-specific mock. The diff is diagnostic evidence; the adaptive implementation remains the product.

## Resolve the persistent workspace first

The skill package is immutable. Never edit it, install dependencies inside it, or write run artifacts into it.

At the start of every invocation, run:

```bash
node <skill-dir>/scripts/workspace.mjs resolve --json
```

- If it returns a valid `workspacePath`, use that repository for the entire run.
- If it exits with `WORKSPACE_NOT_CONFIGURED` or `WORKSPACE_INVALID`, ask the user for an absolute destination directory. Do not guess a location.
- Initialize a new destination with:

```bash
node <skill-dir>/scripts/workspace.mjs init --path '<absolute-path>'
```

- If the user deliberately points to an already initialized compatible workspace, bind it with:

```bash
node <skill-dir>/scripts/workspace.mjs bind --path '<absolute-path>'
```

The initializer copies the bundled template, creates a real local Git repository with no remote, installs dependencies, creates the ignored `runs-local/` directory, and records the selected path through the skill's external state pointer.

## Understand the target before coding

1. Read the target repository's agent instructions and existing component patterns.
2. Identify the exact Figma file key and node ID. Never guess a node.
3. In the resolved workspace, run `pnpm figma:me` before other Figma API work. Log only the returned account identity; never print or persist the token.
4. Inspect the Figma screenshot and hierarchy. Record the target node's dimensions, parent/child layers, layout mode, padding, gaps, fills, strokes, effects, opacity, typography, and clipping behavior.
5. Inspect the corresponding browser DOM hierarchy and computed layout. Record bounding boxes and the computed styles that explain geometry. For a greenfield component with no DOM yet, build the smallest structural first pass, then inspect that DOM before visual tuning.
6. Decide which constraints belong to the reusable component and which exist only to reproduce one static Figma projection. Put viewport, fixed canvas, crop, and forced-state constraints in the Storybook story or comparison script, not in the production component.

When Figma MCP tools are available, prefer `get_design_context` for the target node and use metadata or screenshots to drill down. REST exports remain the source for exact 4x reference PNGs. If a task requires `use_figma`, load the `figma-use` skill before calling it.

## Work from atoms to composition

Start with the smallest independently meaningful piece that explains the larger result: a text run, icon, logo, button, tab, image mask, or small group. Compare those pieces first, then their containing component, then the section or page composition.

Do not start by diffing a full page when several unverified atoms are nested inside it. Large diffs hide the owning layer and make fixes speculative.

Keep the implementation adaptive:

- Preserve the target project's layout conventions and design-system primitives.
- Round incidental large-layout measurements such as `15.9px` to `16px` when that better expresses the intended constraint.
- Preserve deliberately precise values for small controls, strokes, nested radii, and optical alignment.
- Treat Figma and Chromium font layout, line breaking, antialiasing, and glyph rasterization as different engines. Match declared font properties and the intended text box; do not distort surrounding layout to chase raster-only noise.
- Do not hard-code crop heights, overflow, or fixed canvases into production components merely to match one screenshot.

## Create an iteration

Create one top-level subject under:

```text
<workspace>/runs-local/<subject>/iteration-NNN/
```

One `run.mts` may compare many related atoms or states in that iteration. Treat the script as code-as-config: copy and adapt the nearest example rather than reducing the workflow to a rigid JSON config.

Each comparison gets a descriptive directory:

```text
<comparison-name>/
  01-expected-figma@4x.png
  02-actual-chromium@4x.png
  03-diff-pixelmatch.png
```

The iteration root should also contain:

```text
run.mts
measurements.json
report.json
```

Keep implementation code in the target project. Keep only scripts, measurements, screenshots, and reports in `runs-local/`.

## Measure before capturing

Before taking comparison screenshots:

1. Measure the Figma node and relevant descendants.
2. Measure the browser target and relevant ancestors/descendants with `getBoundingClientRect()` and computed styles.
3. Choose a browser viewport that reproduces the static Figma projection while leaving the component itself adaptive.
4. Set a concrete capture background. This is mandatory for translucent fills, gradients, shadows, antialiased edges, and backdrop effects. Composite the Figma alpha over the same color.
5. Wait for fonts, images, animations, and the requested state. Pause videos and disable nondeterministic motion where needed.
6. Capture Figma at 4x and Chromium with `deviceScaleFactor: 4`.

Use the Figma REST images endpoint with `scale=4` for comparison references. MCP screenshots are excellent for inspection, but some MCP paths return only the node's natural raster size even when a larger maximum is requested. Never upscale a 1x Figma PNG and label it `@4x`; resampling and native 4x rasterization are not comparable evidence.

Figma exports may include effects outside the layout box. Compare `absoluteBoundingBox` with `absoluteRenderBounds` and the exported PNG dimensions. The returned PNG dimensions are authoritative for the comparison canvas; `absoluteBoundingBox` is authoritative for the component's layout box and semantic anchor; `absoluteRenderBounds` is diagnostic and may not exactly match the export canvas. If shadow, blur, or another effect expands the reference, create an explicit browser effect canvas around the component and record its top/right/bottom/left insets. Do not mistake render padding for component padding.

Derive effect insets from the native export size divided by the requested scale. Start with the extra width and height around the layout box, then use effect offsets and the reference image to distribute the extra space asymmetrically. For example, a vertically centered shadow canvas with `y: 2px` has 2px less inset above and 2px more below. Record the derivation; do not assume `absoluteRenderBounds` supplies the final canvas.

Keep the browser target aligned to the device-pixel grid. Before capture, verify that `x * deviceScaleFactor`, `y * deviceScaleFactor`, `width * deviceScaleFactor`, and `height * deviceScaleFactor` are integers. Prefer a measured page clip over a locator screenshot when locator rounding changes the output dimensions. Verify the PNG dimensions after capture instead of assuming Playwright emitted native DPR pixels.

When `tsx` transforms functions passed into `page.evaluate`, Playwright can encounter a missing `__name` helper. If the example uses the compatibility bootstrap, install it before evaluated callbacks:

```ts
await page.evaluate('globalThis.__name = (value) => value')
```

Expected and actual images must have identical pixel dimensions before pixelmatch. If they differ, stop and classify the cause:

- A component or layout box differs: fix the implementation or the test projection.
- The wrong Figma node or browser selector was captured: fix the capture target.
- A benign text/raster bound differs by a fraction: compare a shared explicit CSS/Figma box, not each image's opaque-content bounds.
- Padding is genuinely unavoidable: place both images on equal canvases using the same background and an explicit semantic anchor. Record the padding and anchor in `measurements.json`; never silently center-pad.

Do not create a persistent Chrome profile inside the target project, implementation fixture, or run directory. Use an isolated Playwright context or a task-owned system-temporary profile and remove it after the run.

Choose the comparison background from the component's intended Figma ancestor or the real page/story background. If a detached translucent component has no recoverable background, use `#f5f5f5` as an explicit fallback and record that assumption. Do not choose a background merely because it reduces the diff.

### Preserve stroke ownership

Before implementing a Figma stroke, decide whether it participates in layout. Figma inside strokes on glass surfaces are usually visual overlays and should not shrink the content box.

- Use `border` only when the stroke is structurally part of the box model.
- Use `box-shadow: inset 0 0 0 <width> <color>` for simple inside strokes that must not affect layout.
- Use an absolutely positioned, `pointer-events: none`, `aria-hidden` overlay with inherited radius for independent gradients, masks, or multi-layer strokes.
- Use `outline` with a negative `outline-offset` when its rendering matches the required simple inside stroke.

This distinction matters especially for `0.5px` strokes: Chromium may report a CSS half-pixel border as a computed `1px`, changing content geometry or producing a stronger perimeter. Do not compensate by changing padding until the stroke has been moved to the correct visual layer.

Figma effect radius and CSS shadow blur are not universally interchangeable. Prefer the project's existing implementation or Figma-generated CSS as a starting point, then verify visually. Keep the layout box fixed while tuning the effect layer.

## Measurement evidence contract

`measurements.json` is evidence, not a dump of whichever values were convenient. Record at least:

- `capture`: background, device scale factor, viewport, browser clip, expected and actual pixel sizes, semantic anchor, effect insets, and any normalization or padding.
- `figma`: target ID/name/type, `absoluteBoundingBox`, `absoluteRenderBounds`, clipping, layout mode, padding, gap/item spacing, fills, strokes, effects, opacity, text styles, and a simplified child hierarchy.
- `browser`: viewport, device pixel ratio, target and capture rects, relevant ancestor and child hierarchy, plus computed display/position, box geometry, padding, margin, gap, overflow, fill, border, radius, shadow, filter/backdrop-filter, opacity, and typography.

Keep this focused on layers that explain the comparison. Avoid serializing the whole page when only a short ancestor chain and target subtree matter.

The REST nodes endpoint returns the target subtree but not its ancestors. When ancestor ownership matters, use Figma metadata on the containing page or traverse the file document to recover only the target's ancestor chain. Do not fetch and persist a huge full-file dump in `measurements.json`.

A practical recovery order is: use Figma MCP page metadata when available; otherwise fetch the file document with the shallowest useful `depth`, build an in-memory ID path to the target, and retain only that path. If the ancestor still cannot be recovered, use the real Storybook/page background or the documented fallback rather than inventing parent styling.

Read [references/artifact-contract.md](references/artifact-contract.md) when writing a new run script. It defines the result schema, preflight-failure behavior, and stopping rule.

## Compare and inspect

Use these defaults unless the task has a documented reason to differ:

```ts
const threshold = 0.02
const maxAllowedDiffPercent = 1
```

After every run, inspect the images yourself in this order:

1. `03-diff-pixelmatch.png`
2. `01-expected-figma@4x.png`
3. `02-actual-chromium@4x.png`

Do not rely on `report.json` alone. The report tells you how much differs; the images and layer hierarchies explain why.

Classify visible differences before editing:

- geometry or relative position
- wrong layout ownership or DOM/Figma hierarchy
- fill, gradient, opacity, border, mask, shadow, or backdrop effect
- typography metrics or line wrapping
- rasterization-only noise

Text rasterization is a weak reason to mutate production layout. Do not add `transform`, per-browser offsets, or altered font metrics solely to erase glyph-ink differences when the line box and composition are already correct. Make an optical adjustment only when it visibly improves the real browser design at normal scale, and record the reason.

Fix the smallest owning layer, rerun into the next numbered iteration, and retain prior iterations as a local visual log. Stop when the diff is at or below 1% and visual inspection shows no unexplained owning-layer error. If the ratio remains above 1%, make at least one targeted experiment against the largest coherent diff region; stop only when geometry and hierarchy match and the remaining region is convincingly isolated to engine-specific rasterization or an unavailable asset, with that evidence recorded.

Before finishing, render the component at one meaningfully narrower width. For a fluid component, use an available width about 25% narrower than the Figma projection or a 320px viewport with 16px gutters, whichever is more relevant. For an intrinsically fixed small control, use a 96px viewport. This is a sanity check, not another Figma projection: verify no document overflow, accidental clipping, overlap, or broken wrapping/ellipsis. Record the width and pass criteria in the report.

## Concurrent runs

The workspace is shared and persistent. Give each task a distinct top-level subject. Reserve a new iteration with an atomic `mkdir`; if it already exists, choose the next number instead of editing another agent's run. Never use a shared persistent browser profile. Ordinary runs do not modify `runs-example/`, package metadata, or the skill.

Compare only states represented by an exact Figma node. Production hover, focus, pressed, loading, and disabled behavior should follow the target project's interaction conventions, but do not claim visual verification for states the design file does not define.

## Use the bundled example as a pattern

Read `<workspace>/README.md` and the nearest script under `<workspace>/runs-example/` before writing a new run. The example demonstrates:

- Figma REST export and `/v1/me` token validation
- 4x Figma and Chromium capture
- concrete background compositing
- hierarchy and geometry measurements
- grouped expected/actual/diff artifacts
- pixelmatch report generation

Do not edit `runs-example/` during ordinary project work. Promote a cleaned representative run only when the user explicitly wants to improve the harness examples.

## Completion checklist

- The production component remains adaptive and uses project conventions.
- Static comparison constraints live only in the story or run script.
- Figma and DOM hierarchies were inspected, not inferred from screenshots alone.
- Figma and browser geometry were measured before diffing.
- Every comparison has equal-sized 4x expected, actual, and diff images.
- A concrete shared background was used.
- The diff, expected, and actual images were visually inspected.
- Remaining differences are explained rather than hidden by a permissive threshold.
- Run artifacts live under `runs-local/`; the skill directory is unchanged.
