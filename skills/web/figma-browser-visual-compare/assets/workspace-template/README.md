# figma-browser-visual-compare workspace

Shared harness workspace for comparing Figma-rendered references against real browser screenshots.

The repository should only track reusable harness code, package metadata, and documentation. Per-page comparison runs are persistent local artifacts and stay ignored.

Recommended run layout:

```text
runs-example/
  landing-header/
    iteration-001/
      soft-gradient-pill-tab/
        01-expected-figma@4x.png
        02-actual-chromium@4x.png
        03-diff-pixelmatch.png
      gradient-stroke-pill-button/
        01-expected-figma@4x.png
        02-actual-chromium@4x.png
        03-diff-pixelmatch.png
      run.mts
      measurements.json
      report.json
```

`runs-local/` uses the same shape for actual agent runs and is ignored by git.
Iterate in `runs-local/` first. Promote only a cleaned-up representative run to
`runs-example/` after inspecting the screenshots and DOM/Figma hierarchy.

Workflow:

- Start with small atoms/components, such as a text run, logo, or button.
- Then compare composed components and page sections.
- Before each visual compare, inspect the relevant Figma node hierarchy and browser DOM hierarchy, including each layer's rect and role in the composition.
- Treat Figma/Chromium font rendering and antialiasing differences critically; use diff to locate issues, not as the final product standard.
- Inspect `03-diff-pixelmatch.png` first, then inspect the expected and actual screenshots. The JSON report is only an auxiliary index.
- Always set a concrete browser capture background before screenshotting Storybook, iframe, or any semi-transparent component. The same color should be used when compositing Figma PNG alpha.
- Export Figma references natively with the REST images endpoint at `scale=4`. Do not upscale a natural-size MCP screenshot and label it `@4x`.
- Treat the native export size as the comparison canvas, the Figma layout bounds as the component anchor, and render bounds as diagnostic effect metadata.
- The default pixelmatch threshold is intentionally low (`0.02`) so meaningful light gray and white boundary differences remain visible.
- The default max pixel diff ratio target is `1%`; reports include `passed` and `maxAllowedDiffPercent`.

Token handling:

- Read `TODAY_FIGMA_DEV_TOKEN` from the shell or process environment.
- Call `GET /v1/me` before Figma API work and log the account identity.
- Never print or persist the token.
