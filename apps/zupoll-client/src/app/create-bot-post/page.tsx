"use client";

import { Suspense } from "react";
import { CreateBotPostPage } from "./create-bot-post";

export default function Page() {
  return (
    <Suspense>
      <CreateBotPostPage />
    </Suspense>
  );
}
