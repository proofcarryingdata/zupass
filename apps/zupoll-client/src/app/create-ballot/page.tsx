"use client";

import { Suspense } from "react";
import { CreateBallotPage } from "./create-ballot";

export default function Page() {
  return (
    <Suspense>
      <CreateBallotPage />
    </Suspense>
  );
}
