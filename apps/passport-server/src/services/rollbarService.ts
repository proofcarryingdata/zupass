import Rollbar from "rollbar";
import { requireEnv } from "../util/util";

export type RollbarService = Rollbar | null;

export function startRollbarService(): RollbarService {
  let rollbarToken: string;

  try {
    rollbarToken = requireEnv("ROLLBAR_TOKEN");
  } catch (e) {
    console.log(`[ROLLBAR] not starting, missing env ${e}`);
    return null;
  }

  console.log(`[ROLLBAR] starting`);

  const rollbar = new Rollbar({
    accessToken: rollbarToken,
    captureUncaught: true,
    captureUnhandledRejections: true,
  });

  rollbar.log("Server started.");

  return rollbar;
}
