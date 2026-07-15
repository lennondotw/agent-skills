import { type ReactNode, useState } from "react";

import { PageOutline } from "./page-outline";
import { PageRuler } from "./page-ruler";

export interface ScrollDebugState {
  remappingEnabled: boolean;
  showOutlines: boolean;
  showRulers: boolean;
}

export interface ScrollDebugHarnessProps {
  children: (state: ScrollDebugState) => ReactNode;
}

export const ScrollDebugHarness = ({ children }: ScrollDebugHarnessProps) => {
  const [showRulers, setShowRulers] = useState(true);
  const [remappingEnabled, setRemappingEnabled] = useState(true);
  const [showOutlines, setShowOutlines] = useState(false);

  const state = { remappingEnabled, showOutlines, showRulers };

  return (
    <main className="scroll-debug-page-root">
      {showRulers
        ? (
          <>
            <PageRuler
              className="scroll-debug-ruler scroll-debug-ruler-left"
              side="left"
            />
            <PageRuler
              className="scroll-debug-ruler scroll-debug-ruler-right"
              side="right"
            />
          </>
        )
        : null}

      <PageOutline enabled={showOutlines} />

      <aside className="scroll-debug-panel" data-scroll-debug-ui>
        <strong>Scroll debugger</strong>
        <label>
          <input
            checked={showRulers}
            onChange={(event) => setShowRulers(event.currentTarget.checked)}
            type="checkbox"
          />
          Page rulers
        </label>
        <label>
          <input
            checked={!remappingEnabled}
            onChange={(event) => setRemappingEnabled(!event.currentTarget.checked)}
            type="checkbox"
          />
          Disable scroll mapping
        </label>
        <label>
          <input
            checked={showOutlines}
            onChange={(event) => setShowOutlines(event.currentTarget.checked)}
            type="checkbox"
          />
          Page outlines
        </label>
      </aside>

      {children(state)}
    </main>
  );
};
