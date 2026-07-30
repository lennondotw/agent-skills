import type { CSSProperties } from "react";

export interface PageRulerProps {
  className?: string;
  side?: "left" | "right";
}

const rulerWidth = 34;

const getTickX = (side: "left" | "right", width: number) =>
  side === "left" ? 0 : rulerWidth - width;

const getMaskImage = (side: "left" | "right") =>
  `url("data:image/svg+xml,${
    encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="512" viewBox="0 0 34 512">
  <rect x="${getTickX(side, 34)}" y="0" width="34" height="5" fill="black" />
  <rect x="${getTickX(side, 10)}" y="64" width="10" height="2" fill="black" fill-opacity=".38" />
  <rect x="${getTickX(side, 20)}" y="128" width="20" height="3" fill="black" fill-opacity=".57" />
  <rect x="${getTickX(side, 10)}" y="192" width="10" height="2" fill="black" fill-opacity=".38" />
  <rect x="${getTickX(side, 20)}" y="256" width="20" height="3" fill="black" fill-opacity=".57" />
  <rect x="${getTickX(side, 10)}" y="320" width="10" height="2" fill="black" fill-opacity=".38" />
  <rect x="${getTickX(side, 20)}" y="384" width="20" height="3" fill="black" fill-opacity=".57" />
  <rect x="${getTickX(side, 10)}" y="448" width="10" height="2" fill="black" fill-opacity=".38" />
</svg>
`)
  }")`;

export const PageRuler = ({ className, side = "right" }: PageRulerProps) => {
  const maskImage = getMaskImage(side);
  const style = {
    backgroundColor: "rgb(var(--scroll-debug-ruler-color, 0 0 0) / 42%)",
    maskImage,
    maskPosition: `${side} top`,
    maskRepeat: "repeat-y",
    maskSize: `${rulerWidth}px 512px`,
    WebkitMaskImage: maskImage,
    WebkitMaskPosition: `${side} top`,
    WebkitMaskRepeat: "repeat-y",
    WebkitMaskSize: `${rulerWidth}px 512px`,
  } satisfies CSSProperties;

  return (
    <div
      aria-hidden="true"
      className={className}
      data-scroll-debug-ruler={side}
      style={style}
    />
  );
};
