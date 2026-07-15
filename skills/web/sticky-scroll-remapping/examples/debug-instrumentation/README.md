# Debug Instrumentation Example

These files are intentionally framework-light and can be copied into a Motion
React example. Import the CSS once, then pass the baseline flag into the sticky
scene without changing its DOM or layout.

```tsx
import { motion, useReducedMotion, useTransform } from "motion/react";

import "./debug-instrumentation.css";
import { ScrollDebugHarness } from "./scroll-debug-harness";

const StickyScene = ({ remappingEnabled }: { remappingEnabled: boolean; }) => {
  const prefersReducedMotion = useReducedMotion();
  const compensationY = useTransform(() => {
    if (!remappingEnabled || prefersReducedMotion) return 0;

    return getNativeDisplacement() - getTargetDisplacement();
  });

  return (
    <section className="scene-track">
      <div className="scene-sticky">
        <motion.div className="scene-visual" style={{ y: compensationY }}>
          Content
        </motion.div>
      </div>
    </section>
  );
};

export const Example = () => (
  <ScrollDebugHarness>
    {({ remappingEnabled }) => <StickyScene remappingEnabled={remappingEnabled} />}
  </ScrollDebugHarness>
);
```

The ruler receives no positioning classes internally. Its caller makes it an
absolute full-height child of `.scroll-debug-page-root`, so the marks move with
the document rather than remaining fixed to the viewport.

For a horizontal rail or another nested projection, use the same
`remappingEnabled` flag and return its native transform in disabled mode. Keep
track height and sticky geometry unchanged.
