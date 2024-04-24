import { Provider } from "@rollbar/react";
import React from "react";
import { Configuration } from "rollbar";

export interface ClientRollbarConfig {
  accessToken?: string;
  environmentName?: string;
}

export function RollbarProvider({
  children,
  config
}: {
  children: React.ReactNode;
  config: ClientRollbarConfig;
}): JSX.Element {
  if (
    config.accessToken === undefined ||
    config.environmentName === undefined
  ) {
    console.log("[ROLLBAR] missing environment variable - not starting");
    return <>{children}</>;
  }

  const rollbarConfig: Configuration = {
    accessToken: config.accessToken,
    environment: config.environmentName,
    captureUncaught: true,
    captureUnhandledRejections: true,
    payload: {
      client: {
        javascript: {
          source_map_enabled: true
        }
      }
    }
  };

  console.log("[ROLLBAR] started");

  return <Provider config={rollbarConfig}>{children}</Provider>;
}
