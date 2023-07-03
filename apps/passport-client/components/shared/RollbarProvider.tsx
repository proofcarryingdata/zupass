import { Provider } from "@rollbar/react";
import React from "react";
import { Configuration } from "rollbar";

export function RollbarProvider({ children }: { children: React.ReactNode }) {
  if (
    process.env.ROLLBAR_TOKEN === undefined ||
    process.env.ROLLBAR_ENV_NAME === undefined
  ) {
    console.log("[ROLLBAR] missing environment variable - not starting");
    return <>{children}</>;
  }

  const rollbarConfig: Configuration = {
    accessToken: process.env.ROLLBAR_TOKEN,
    environment: process.env.ROLLBAR_ENV_NAME,
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      client: {
        javascript: {
          source_map_enabled: true,
        },
      },
    },
  };

  console.log("[ROLLBAR] started");

  return <Provider config={rollbarConfig}>{children}</Provider>;
}
