"use client";

import { useTheme } from "@/components/ui/ThemeSwitcher";
import { useEffect } from "react";

export function StartupHooks({ children }: React.PropsWithChildren) {
  useTheme();

  useEffect(() => {
    document.addEventListener("gesturestart", function (e) {
      e.preventDefault();
      (document.body.style as any).zoom = 1;
    });

    document.addEventListener("gesturechange", function (e) {
      e.preventDefault();

      (document.body.style as any).zoom = 1;
    });
    document.addEventListener("gestureend", function (e) {
      e.preventDefault();
      (document.body.style as any).zoom = 1;
    });
  });

  return <>{children}</>;
}
