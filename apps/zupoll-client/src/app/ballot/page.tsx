"use client";

import { Suspense } from "react";
import { BallotPage } from "./ballot";

export default function Page() {
  return (
    <Suspense>
      <BallotPage />
    </Suspense>
  );
}
