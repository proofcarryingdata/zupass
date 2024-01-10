import * as React from "react";
import type { SVGProps } from "react";
const SvgCloseWhite = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={20}
    height={21}
    fill="none"
    {...props}
  >
    <path
      stroke="#fff"
      strokeWidth={2}
      d="m.707 1.15 18 18M18.707 1.707l-18 18"
    />
  </svg>
);
export default SvgCloseWhite;
