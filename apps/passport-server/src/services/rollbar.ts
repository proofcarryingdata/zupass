import Rollbar from "rollbar";
import { requireEnv } from "../util/util";

export function getRollbar(): Rollbar | null {
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
