import * as React from "react";
import type { SVGProps } from "react";
const SvgLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    width={160}
    height={156}
    fill="none"
    {...props}
  >
    <g filter="url(#logo_svg__a)">
      <path
        fill="url(#logo_svg__b)"
        d="M0 77.5c.01 17.144 5.357 33.846 15.276 47.721S39.18 149.434 55.23 154.76v-4.405c-14.796-5.203-27.648-14.92-36.797-27.82-9.15-12.901-14.15-28.356-14.317-44.252h8.552c.163 13.541 4.299 26.725 11.879 37.868 7.58 11.142 18.26 19.738 30.676 24.688v-1.687c-12.108-4.957-22.48-13.476-29.783-24.461-7.304-10.986-11.207-23.937-11.207-37.191s3.903-26.205 11.206-37.19c7.304-10.986 17.676-19.505 29.784-24.462V14.16C42.808 19.112 32.13 27.708 24.55 38.851S12.838 63.177 12.676 76.717h-8.56c.166-15.895 5.166-31.35 14.314-44.25S40.428 9.85 55.223 4.646V.237C39.172 5.565 25.19 15.904 15.273 29.78 5.354 43.655.01 60.357 0 77.5"
      />
      <path
        fill="url(#logo_svg__c)"
        d="M136.561 20.076C127.473 10.809 116.306 3.92 104.017 0v4.384c14.976 5.092 28.018 14.793 37.311 27.757 9.294 12.963 14.379 28.543 14.548 44.576h-9.304c-.163-13.541-4.298-26.725-11.878-37.868-7.58-11.142-18.261-19.738-30.677-24.688v1.687c12.108 4.957 22.48 13.476 29.784 24.461 7.303 10.986 11.206 23.937 11.206 37.191s-3.903 26.205-11.206 37.191c-7.304 10.985-17.676 19.504-29.784 24.461v1.687c12.416-4.95 23.097-13.546 30.677-24.688 7.58-11.143 11.715-24.327 11.878-37.868h9.304c-.168 16.032-5.252 31.612-14.544 44.575S119 145.523 104.025 150.616v4.389c13.116-4.196 24.946-11.752 34.348-21.94s16.06-22.663 19.331-36.223a82.44 82.44 0 0 0-.658-41.193c-3.702-13.445-10.755-25.695-20.477-35.568z"
      />
      <path
        fill="url(#logo_svg__d)"
        d="M79.996 122.077c-24.212 0-43.91-19.997-43.91-44.577s19.697-44.577 43.91-44.577 43.91 19.997 43.91 44.577-19.698 44.577-43.91 44.577m0-87.587c-23.361 0-42.367 19.294-42.367 43.01s19.006 43.01 42.367 43.01 42.367-19.294 42.367-43.01-19.006-43.01-42.367-43.01"
      />
      <path
        fill="url(#logo_svg__e)"
        d="M79.875 117.821a39.4 39.4 0 0 0 21.871-6.645c6.495-4.334 11.599-10.504 14.682-17.747l-4.331-2.612V80.24l-10.289-5.408v22.254h-4.365v9.617h-1.628V45.684l-10.127 10.28v13.817l-7.236 7.338v29.57h-1.661V92.032L71.6 88.426v18.263h-1.656v-29.93l-8.052 7.092v22.838h-2.6v-9.017h-1.543v-5.768h-4.63V74.716l-6.274 4.7v15.859l-1.834 1.69a40.13 40.13 0 0 0 14.626 15.261 39.35 39.35 0 0 0 20.238 5.595"
      />
    </g>
    <defs>
      <linearGradient
        id="logo_svg__b"
        x1={27.615}
        x2={27.615}
        y1={0.238}
        y2={154.76}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFCA62" />
        <stop offset={0.484} stopColor="#FFEEC5" />
        <stop offset={1} stopColor="#FCD475" />
      </linearGradient>
      <linearGradient
        id="logo_svg__c"
        x1={132.009}
        x2={132.009}
        y1={0}
        y2={155.005}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFCA62" />
        <stop offset={0.484} stopColor="#FFEEC5" />
        <stop offset={1} stopColor="#FCD475" />
      </linearGradient>
      <linearGradient
        id="logo_svg__d"
        x1={79.996}
        x2={79.996}
        y1={32.923}
        y2={122.077}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFCA62" />
        <stop offset={0.484} stopColor="#FFEEC5" />
        <stop offset={1} stopColor="#FCD475" />
      </linearGradient>
      <linearGradient
        id="logo_svg__e"
        x1={80.72}
        x2={80.72}
        y1={45.684}
        y2={117.821}
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#FFCA62" />
        <stop offset={0.484} stopColor="#FFEEC5" />
        <stop offset={1} stopColor="#FCD475" />
      </linearGradient>
      <filter
        id="logo_svg__a"
        width={160}
        height={155.005}
        x={0}
        y={0}
        filterUnits="userSpaceOnUse"
      >
        <feFlood floodOpacity={0} result="BackgroundImageFix" />
        <feBlend in="SourceGraphic" in2="BackgroundImageFix" result="shape" />
        <feColorMatrix
          in="SourceAlpha"
          result="hardAlpha"
          values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 127 0"
        />
        <feOffset dy={1} />
        <feComposite in2="hardAlpha" k2={-1} k3={1} operator="arithmetic" />
        <feColorMatrix values="0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.4 0" />
        <feBlend in2="shape" result="effect1_innerShadow_125_1454" />
      </filter>
    </defs>
  </svg>
);
export default SvgLogo;
