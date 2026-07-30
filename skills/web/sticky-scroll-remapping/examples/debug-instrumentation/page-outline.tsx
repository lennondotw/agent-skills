import { useEffect } from "react";

const styleId = "scroll-debug-page-outline-style";
const bodyAttribute = "scrollDebugOutline";

const outlineCss = `
body[data-scroll-debug-outline] *,
body[data-scroll-debug-outline] *::before,
body[data-scroll-debug-outline] *::after {
  outline: 1px solid rgb(255 0 100 / 25%) !important;
  outline-offset: -1px !important;
}
`;

export interface PageOutlineProps {
  enabled: boolean;
}

export const PageOutline = ({ enabled }: PageOutlineProps) => {
  useEffect(() => {
    let style = document.getElementById(styleId) as HTMLStyleElement | null;

    if (!style) {
      style = document.createElement("style");
      style.id = styleId;
      style.textContent = outlineCss;
      document.head.appendChild(style);
    }

    if (enabled) {
      document.body.dataset[bodyAttribute] = "true";
    } else {
      delete document.body.dataset[bodyAttribute];
    }

    return () => {
      delete document.body.dataset[bodyAttribute];
    };
  }, [enabled]);

  return null;
};
