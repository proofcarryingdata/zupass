import { Bot } from "grammy";
import { startBot } from "./bot";
import { startServer } from "./routing/server";
import { logger } from "./util/logger";

export async function startApplication() {
  const context: ApplicationContext = {
    bot: undefined
  };

  startBot(context).catch((e) => {
    logger.error("failed to start bot", e);
  });

  await startServer(context);
}

export interface ApplicationContext {
  bot?: Bot;
}
