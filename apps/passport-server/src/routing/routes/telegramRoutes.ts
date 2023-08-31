import express, { Request, Response } from "express";
import path from "path";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { decodeString } from "../../util/util";

export function initTelegramRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { telegramService, rollbarService }: GlobalServices
): void {
  logger("[INIT] initializing Telegram routes");

  /**
   * When the user issues the `start` command to the bot, they are sent to
   * the passport client. Once they have selected their PCD, they will be
   * directed here, with the proof in the query parameters.
   *
   * If we can verify the PCD, the bot will send them a message containing
   * an invite to the chat. In that case, we redirect the user back to
   * Telegram.
   */
  app.get("/telegram/verify/:id", async (req: Request, res: Response) => {
    try {
      const { proof } = req.query;
      const telegram_user_id = decodeString(req.params.id, "id");
      if (!proof || typeof proof !== "string") {
        throw new Error("proof field needs to be a string and be non-empty");
      }

      if (
        !telegram_user_id ||
        typeof telegram_user_id !== "string" ||
        !/^-?\d+$/.test(telegram_user_id)
      ) {
        throw new Error(
          "telegram_user_id field needs to be a numeric string and be non-empty"
        );
      }

      logger(`[TELEGRAM] Verifying ticket for ${telegram_user_id}`);

      if (!telegramService) {
        throw new Error("Telegram service not initialized");
      }
      try {
        await telegramService.handleVerification(
          proof,
          parseInt(telegram_user_id)
        );
        logger(
          `[TELEGRAM] Redirecting to telegram for user id  ${telegram_user_id}`
        );
        res.redirect(await telegramService.getBotURL());
      } catch (e) {
        logger("[TELEGRAM] failed to verify", e);
        rollbarService?.reportError(e);
        res.set("Content-Type", "text/html");
        res.sendFile(path.resolve("resources/telegram/error.html"));
        res.sendStatus(500);
      }
    } catch (e) {
      logger("[TELEGRAM] failed to verify", e);
      rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  });
}
