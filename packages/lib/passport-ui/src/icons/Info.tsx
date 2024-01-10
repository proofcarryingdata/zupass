import * as React from "react";
import type { SVGProps } from "react";
const SvgInfo = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="6 6 20 20" {...props}>
    <path
      d="M20 25.332h-5.332V14.668H12V12h5.332v10.668H20ZM14.668 6.668h2.664v2.664h-2.664Zm0 0"
      style={{
        stroke: "none",
        fillRule: "nonzero",
        fill: "#fff",
        fillOpacity: 1
      }}
    />
  </svg>
);
export default SvgInfo;
