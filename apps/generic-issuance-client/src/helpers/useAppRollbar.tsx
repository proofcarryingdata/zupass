import { useRollbar } from "@rollbar/react";
import Rollbar from "rollbar";
import { appConfig } from "./appConfig";

export function useAppRollbar(): Rollbar | undefined {
  if (
    appConfig.rollbarEnvName === undefined ||
    appConfig.rollbarToken === undefined
  ) {
    return undefined;
  }

  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useRollbar();
}
