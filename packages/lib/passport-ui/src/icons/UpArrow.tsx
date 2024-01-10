import * as React from "react";
import type { SVGProps } from "react";
const SvgUpArrow = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    data-name="1-Arrow Up"
    viewBox="0 0 32 32"
    {...props}
  >
    <path
      fill="#fff"
      stroke="#fff"
      d="m26.71 10.29-10-10a1 1 0 0 0-1.41 0l-10 10 1.41 1.41L15 3.41V32h2V3.41l8.29 8.29Z"
    />
  </svg>
);
export default SvgUpArrow;
