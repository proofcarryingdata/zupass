import { RollbarService, requireEnv } from "@pcd/server-shared";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

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
