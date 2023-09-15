import { stopApplication } from "../application";
import { PCDpass } from "../types";
import { logger } from "./logger";

export function trapSigTerm(app: PCDpass): void {
  logger(`[PROCESS] server is on PID ${process.pid}`);

  process.on("SIGTERM", async () => {
    logger("[PROCESS] CAUGHT SIGTERM");
    await app.services.discordService?.sendAlert(
      `Server \`${process.env.ROLLBAR_ENV_NAME}\` stopping`
    );
    await stopApplication(app);
    logger("[PROCESS] finished trap SIGTERM");
    process.exit(0);
  });
}
