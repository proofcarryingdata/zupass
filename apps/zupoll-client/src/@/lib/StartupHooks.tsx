"use client";

import { useTheme } from "@/components/ui/ThemeSwitcher";
import { RollbarProvider } from "@pcd/client-shared";
import { useEffect } from "react";
import { APP_CONFIG } from "../../env";

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

  return (
    <RollbarProvider
      config={{
        accessToken: APP_CONFIG.rollbarAccessToken,
        environmentName: APP_CONFIG.rollbarEnvName
      }}
    >
      {children}
    </RollbarProvider>
  );
}
