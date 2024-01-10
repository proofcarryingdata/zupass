import * as React from "react";
import type { SVGProps } from "react";
const SvgQrCenterLoading = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={64}
    height={64}
    preserveAspectRatio="xMidYMid"
    style={{
      margin: "auto",
      background: "#fff",
      display: "block",
      shapeRendering: "auto"
    }}
    viewBox="0 0 100 100"
    {...props}
  >
    <circle
      cx={50}
      cy={50}
      r={40}
      fill="none"
      stroke="#19473f"
      strokeDasharray="188.49555921538757 64.83185307179586"
      strokeWidth={6}
    >
      <animateTransform
        attributeName="transform"
        dur="1.25s"
        keyTimes="0;1"
        repeatCount="indefinite"
        type="rotate"
        values="0 50 50;360 50 50"
      />
    </circle>
  </svg>
);
export default SvgQrCenterLoading;
