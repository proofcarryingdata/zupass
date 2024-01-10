import * as React from "react";
import type { SVGProps } from "react";
const SvgInputObject = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="8 8 16 16" {...props}>
    <path
      d="M13.332 9.332H24V12H13.332ZM8 9.332h2.668V12H8Zm5.332 5.336H24v2.664H13.332Zm-5.332 0h2.668v2.664H8ZM13.332 20H24v2.668H13.332ZM8 20h2.668v2.668H8Zm0 0"
      style={{
        stroke: "none",
        fillRule: "nonzero",
        fill: "#fff",
        fillOpacity: 1
      }}
    />
  </svg>
);
export default SvgInputObject;
