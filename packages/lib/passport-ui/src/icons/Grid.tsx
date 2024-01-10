import * as React from "react";
import type { SVGProps } from "react";
const SvgGrid = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    id="grid_svg__Layer_1"
    data-name="Layer 1"
    viewBox="0 0 16 16"
    {...props}
  >
    <defs>
      <style>{".grid_svg__cls-1{fill-rule:evenodd;fill:#fff}"}</style>
    </defs>
    <path d="M.5 8.5v-1h15v1z" className="grid_svg__cls-1" />
    <path d="M8.5 15.5h-1V.5h1z" className="grid_svg__cls-1" />
    <path
      d="M.5 3.5v-1h15v1zm7 12V.5m1 0v15m-8-2v-1h15v1zm7 2V.5m1 0v15"
      className="grid_svg__cls-1"
    />
    <path
      d="M3.5 15.5h-1V.5h1zm4 0V.5m1 0v15m5 0h-1V.5h1z"
      className="grid_svg__cls-1"
    />
  </svg>
);
export default SvgGrid;
