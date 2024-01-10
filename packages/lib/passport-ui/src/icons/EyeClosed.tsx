import * as React from "react";
import type { SVGProps } from "react";
const SvgEyeClosed = (props: SVGProps<SVGSVGElement>) => (
  <svg xmlns="http://www.w3.org/2000/svg" width={32} height={32} {...props}>
    <path
      fill="#929292"
      fillRule="evenodd"
      d="M8.109 20.891C4.617 18.831 3 16 3 16s4-7 13-7c1.305 0 2.504.147 3.601.399l-.85.85A15 15 0 0 0 16 10c-8 0-11.8 6-11.8 6s1.515 2.392 4.645 4.155zm4.29 1.71c1.097.252 2.296.399 3.601.399 9 0 13-7 13-7s-1.617-2.83-5.109-4.891l-.736.736C26.285 13.608 27.8 16 27.8 16S24 22 16 22c-.98 0-1.897-.09-2.752-.248zm7.5-7.5q.1.435.101.899a4 4 0 0 1-4.899 3.899L16 19a3 3 0 0 0 2.121-.879A3 3 0 0 0 19 16zm-3-3a4 4 0 0 0-4.797 4.797L13 16c0-.768.293-1.536.879-2.121A3 3 0 0 1 16 13zM24 7 7 24l1 1L25 8z"
    />
  </svg>
);
export default SvgEyeClosed;
