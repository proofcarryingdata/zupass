import { Provider } from "@rollbar/react";
import React from "react";

export function RollbarProvider({ children }: { children: React.ReactNode }) {
  if (process.env.ROLLBAR_TOKEN === undefined) {
    console.log("[ROLLBAR] missing environment variable - not starting");
    return <>{children}</>;
  }

  const rollbarConfig = {
    accessToken: process.env.ROLLBAR_TOKEN,
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      client: {
        javascript: {
          code_version: "1.0.0",
          source_map_enabled: true,
        },
      },
    },
  };

  console.log("[ROLLBAR] started");

  return <Provider config={rollbarConfig}>{children}</Provider>;
}
