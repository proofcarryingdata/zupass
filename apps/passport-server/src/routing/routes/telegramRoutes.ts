import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initTelegramRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { telegramService, rollbarService }: GlobalServices
): void {
  logger("[INIT] initializing Telegram routes");

  // Redirected from
  // them to create their passport.
  app.get("/telegram/verify", async (req: Request, res: Response) => {
    try {
      const { proof, telegram_user_id } = req.query;
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

      if (!telegramService) {
        throw new Error("Telegram service not initialized");
      }
      const verified = await telegramService.verifyEdDSATicket(
        proof,
        parseInt(telegram_user_id)
      );

      if (verified) {
        res.redirect(await telegramService.getBotURL());
      } else {
        res.set("Content-Type", "text/html");
        res.send(Buffer.from("<div>Failed to verify</div>"));
      }
    } catch (e) {
      logger(e);
      rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  });
}
