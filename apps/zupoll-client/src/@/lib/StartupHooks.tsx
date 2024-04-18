"use client";

import { useEffect } from "react";

export function StartupHooks({ children }: React.PropsWithChildren) {
  useEffect(() => {
    document.addEventListener("gesturestart", function (e) {
      e.preventDefault();
      (document.body.style as any).zoom = 0.99;
    });

    document.addEventListener("gesturechange", function (e) {
      e.preventDefault();

      (document.body.style as any).zoom = 0.99;
    });
    document.addEventListener("gestureend", function (e) {
      e.preventDefault();
      (document.body.style as any).zoom = 1;
    });
  });

  return <>{children}</>;
}
