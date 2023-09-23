import express, { Request, Response } from "express";
import path from "path";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { closeWebviewHtml } from "../../util/telegramWebApp";
import { checkQueryParam, checkUrlParam } from "../params";

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
      const telegram_user_id = checkUrlParam(req, "id");
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
        res.setHeader("Content-Type", "text/html");
        res.send(closeWebviewHtml);
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
      res.set("Content-Type", "text/html");
      res.status(500).sendFile(path.resolve("resources/telegram/error.html"));
    }
  });

  /**
   * When an EdDSATicket holder wants to send an anonymous message to
   * the Telegram Q&A channel, they are first directed to passport client.
   * Once they have created a ZKEdDSA proof, they will be directed here,
   * with the proof in the query parameters.
   *
   * If we can verify the PCD, the bot will proceed with posting a message
   * to the channel. The PartialTicket of the ZKEdDSATicket needs to have
   * the `eventId` as a required field and the 'watermark' of the field
   * will contain the anonymous message to be sent.
   */
  app.get("/telegram/message", async (req, res) => {
    try {
      const proof = checkQueryParam(req, "proof");
      const message = checkQueryParam(req, "message");

      if (!proof || typeof proof !== "string") {
        throw new Error("proof field needs to be a string and be non-empty");
      }

      if (!message || typeof message !== "string") {
        throw new Error("message field needs to be a string and be non-empty");
      }

      if (!telegramService) {
        throw new Error("Telegram service not initialized");
      }

      try {
        await telegramService.handleSendAnonymousMessage(proof, message);
        logger(`[TELEGRAM] Posted anonymous message: ${message}`);
        res.sendStatus(200);
      } catch (e) {
        logger("[TELEGRAM] failed to send anonymous message", e);
        rollbarService?.reportError(e);
        res.set("Content-Type", "text/html");
        res.status(500).sendFile(path.resolve("resources/telegram/error.html"));
      }
    } catch (e) {
      logger("[TELEGRAM] failed to send anonymous message", e);
      rollbarService?.reportError(e);
      res.status(500).sendFile(path.resolve("resources/telegram/error.html"));
    }
  });
}
