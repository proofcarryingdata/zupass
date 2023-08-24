import Rollbar from "rollbar";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { requireEnv } from "../util/util";

export class RollbarService {
  private rollbar: Rollbar;

  public constructor(
    rollbarToken: string,
    rollbarEnvironmentName: string,
    gitCommitHash: string
  ) {
    this.rollbar = new Rollbar({
      accessToken: rollbarToken,
      captureUncaught: true,
      captureUnhandledRejections: true,
      environment: rollbarEnvironmentName,
      payload: {
        custom: { gitCommitHash }
      }
    });
  }

  public reportError(e: any): void {
    this.rollbar.error(e);
  }

  public log(log: string): void {
    this.rollbar.log(log);
  }
}

/**
 * Responsible for error-reporting.
 */
export function startRollbarService(
  context: ApplicationContext
): RollbarService | null {
  let rollbarToken: string;
  let rollbarEnvironmentName: string;

  try {
    rollbarToken = requireEnv("ROLLBAR_TOKEN");
    rollbarEnvironmentName = requireEnv("ROLLBAR_ENV_NAME");
  } catch (e) {
    logger(`[ROLLBAR] not starting, missing env ${e}`);
    return null;
  }

  logger(`[ROLLBAR] starting`);
  const rollbarService = new RollbarService(
    rollbarToken,
    rollbarEnvironmentName,
    context.gitCommitHash
  );

  return rollbarService;
}
