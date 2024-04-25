import { RollbarService, getCommitHash, requireEnv } from "@pcd/server-shared";
import { Bot } from "grammy";
import { startBot } from "./bot";
import { startServer } from "./routing/server";
import { logger } from "./util/logger";

export async function startApplication() {
  const context: ApplicationContext = {
    bot: undefined,
    rollbarService: await startRollbarService()
  };

  startBot(context).catch((e) => {
    logger.error("failed to start bot", e);
  });

  await context?.rollbarService?.log("Server Started");

  await startServer(context);
}

export interface ApplicationContext {
  bot?: Bot;
  rollbarService?: RollbarService;
}

export async function startRollbarService(): Promise<
  RollbarService | undefined
> {
  let rollbarToken: string;
  let rollbarEnvironmentName: string;

  try {
    rollbarToken = requireEnv("ROLLBAR_TOKEN");
    rollbarEnvironmentName = requireEnv("ROLLBAR_ENV_NAME");
  } catch (e) {
    console.log(`[ROLLBAR] not starting, missing env ${e}`);
    return undefined;
  }

  console.log(`[ROLLBAR] starting`);
  const rollbarService = new RollbarService(
    rollbarToken,
    rollbarEnvironmentName,
    await getCommitHash()
  );

  return rollbarService;
}
