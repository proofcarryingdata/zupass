"use client";

import { Buffer } from "buffer";
import { Suspense } from "react";
import { HomePage } from "./home";

console.log(Buffer);

export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
