import { useRollbar } from "@rollbar/react";
import Rollbar from "rollbar";

export function useAppRollbar(): Rollbar | undefined {
  return useRollbar();
}
