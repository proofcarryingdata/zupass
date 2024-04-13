"use client";

import { Suspense } from "react";
import { HomePage } from "./home";

export default function Page() {
  return (
    <Suspense>
      <HomePage />
    </Suspense>
  );
}
