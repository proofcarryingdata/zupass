import Rollbar from "rollbar";
import { logger } from "../util/logger";
import { requireEnv } from "../util/util";
import { RollbarService } from "./types";

/**
 * Responsible for error-reporting.
 */
export function startRollbarService(): RollbarService {
  let rollbarToken: string;

  try {
    rollbarToken = requireEnv("ROLLBAR_TOKEN");
  } catch (e) {
    logger(`[ROLLBAR] not starting, missing env ${e}`);
    return null;
  }

  logger(`[ROLLBAR] starting`);

  const rollbar = new Rollbar({
    accessToken: rollbarToken,
    captureUncaught: true,
    captureUnhandledRejections: true,
  });

  rollbar.log("Server started.");

  return rollbar;
}
