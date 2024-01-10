import * as React from "react";
import type { SVGProps } from "react";
const SvgCheckmark = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="8 8 18 18" {...props}>
    <path
      d="m13.332 23.219-4.941-4.942 1.886-1.886 3.055 3.058 9.727-9.726 1.882 1.886Zm0 0"
      style={{
        stroke: "none",
        fillRule: "nonzero",
        fill: "#fff",
        fillOpacity: 1
      }}
    />
  </svg>
);
export default SvgCheckmark;
