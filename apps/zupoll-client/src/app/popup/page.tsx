"use client";

import { Suspense } from "react";
import { PopupPage } from "./popup";

export default function Page() {
  return (
    <Suspense>
      <PopupPage />
    </Suspense>
  );
}
