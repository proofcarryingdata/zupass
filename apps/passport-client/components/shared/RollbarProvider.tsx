import { Provider } from "@rollbar/react";
import React from "react";
import { Configuration } from "rollbar";
import { appConfig } from "../../src/appConfig";

export function RollbarProvider({
  children
}: {
  children: React.ReactNode;
}): JSX.Element {
  if (
    appConfig.rollbarToken === undefined ||
    appConfig.rollbarEnvName === undefined
  ) {
    console.log("[ROLLBAR] missing environment variable - not starting");
    return <>{children}</>;
  }

  const rollbarConfig: Configuration = {
    accessToken: appConfig.rollbarToken,
    environment: appConfig.rollbarEnvName,
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
