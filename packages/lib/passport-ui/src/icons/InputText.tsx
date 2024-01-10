import * as React from "react";
import type { SVGProps } from "react";
const SvgInputText = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} {...props}>
    <path
      d="M12.906 6.57H4V1.5h23.89v5.07h-8.906v24.02h-6.078Zm0 0"
      style={{
        stroke: "none",
        fillRule: "nonzero",
        fill: "#fff",
        fillOpacity: 1
      }}
    />
  </svg>
);
export default SvgInputText;
