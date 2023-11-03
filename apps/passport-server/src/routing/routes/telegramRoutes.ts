import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import {
  closeWebviewHtml,
  errorHtmlWithDetails
} from "../../util/telegramWebApp";
import {
  checkOptionalUrlParam,
  checkQueryParam,
  checkUrlParam
} from "../params";

export function initTelegramRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { telegramService, rollbarService }: GlobalServices
): void {
  logger("[INIT] initializing Telegram routes");

  /**
   * When the user issues the `start` command to the bot, they are sent to
   * the Zupass client. Once they have selected their PCD, they will be
   * directed here, with the proof in the query parameters.
   *
   * If we can verify the PCD, the bot will send them a message containing
   * an invite to the chat. In that case, we redirect the user back to
   * Telegram.
   */
  app.get(
    "/telegram/verify/:id/:username?",
    async (req: Request, res: Response) => {
      try {
        const proof = checkQueryParam(req, "proof");
        const telegram_user_id = checkUrlParam(req, "id");
        let telegram_username = checkOptionalUrlParam(req, "username");

        if (!telegram_user_id || !/^-?\d+$/.test(telegram_user_id)) {
          throw new Error(
            "telegram_user_id field needs to be a numeric string and be non-empty"
          );
        }

        // express path param value should always be undefined rather than empty string, but adding this just in case
        if (telegram_username?.length === 0) {
          telegram_username = undefined;
        }

        logger(
          `[TELEGRAM] Verifying ticket for ${telegram_user_id}` +
            (telegram_username && ` with username ${telegram_username}`)
        );

        if (!telegramService) {
          throw new Error("Telegram service not initialized");
        }
        await telegramService.handleVerification(
          proof,
          parseInt(telegram_user_id),
          telegram_username
        );
        logger(
          `[TELEGRAM] Redirecting to telegram for user id ${telegram_user_id}` +
            (telegram_username && ` with username ${telegram_username}`)
        );
        res.setHeader("Content-Type", "text/html");
        res.send(closeWebviewHtml);
      } catch (e) {
        logger("[TELEGRAM] failed to verify", e);
        rollbarService?.reportError(e);
        res.set("Content-Type", "text/html");
        res.status(500).send(errorHtmlWithDetails(e as Error));
      }
    }
  );

  /**
   * When an EdDSATicket holder wants to send an anonymous message to
   * the Telegram Q&A channel, they are first directed to the Zupass client.
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
      const topicId = checkQueryParam(req, "topicId");

      if (!proof || typeof proof !== "string") {
        throw new Error("proof field needs to be a string and be non-empty");
      }

      if (!message || typeof message !== "string") {
        throw new Error("message field needs to be a string and be non-empty");
      }

      if (!topicId || typeof topicId !== "string") {
        throw new Error("topicId field needs to be a string and be non-empty");
      }

      if (!telegramService) {
        throw new Error("Telegram service not initialized");
      }

      await telegramService.handleSendAnonymousMessage(proof, message, topicId);
      logger(`[TELEGRAM] Posted anonymous message: ${message}`);
      res.setHeader("Content-Type", "text/html");
      res.send(closeWebviewHtml);
    } catch (e) {
      logger("[TELEGRAM] failed to send anonymous message", e);
      rollbarService?.reportError(e);
      res.set("Content-Type", "text/html");
      res.status(500).send(errorHtmlWithDetails(e as Error));
    }
  });

  app.get("/telegram/anon", async (req: Request, res: Response) => {
    try {
      const { tgWebAppStartParam } = req.query;
      if (!tgWebAppStartParam) throw new Error(`No start param received`);

      const onlyDigits = /^\d+$/;
      if (onlyDigits.test(tgWebAppStartParam.toString())) {
        logger(
          `[TELEGRAM] Redirecting for anonymous profile for nullifier hash ${tgWebAppStartParam.toString()}`
        );
        res.redirect(
          `${
            process.env.TELEGRAM_ANON_WEBSITE
          }/${tgWebAppStartParam.toString()}`
        );
      } else {
        const [chatId, topicId] = tgWebAppStartParam.toString().split("_");
        if (!chatId || !topicId)
          throw new Error(`No chatId or topicId received`);

        if (!telegramService) {
          throw new Error("Telegram service not initialized");
        }
        const redirectUrl =
          await telegramService.handleRequestAnonymousMessageLink(
            parseInt(chatId),
            parseInt(topicId)
          );

        if (!redirectUrl) throw new Error(`Couldn't load redirect url`);
        logger(`[TELEGRAM] Redirecting for anonymous post to chat ${chatId}`);
        res.redirect(redirectUrl);
      }
    } catch (e) {
      logger("[TELEGRAM] generate link for anonymous message", e);
      rollbarService?.reportError(e);
      res.set("Content-Type", "text/html");
      res.status(500).send(errorHtmlWithDetails(e as Error));
    }
  });

  app.get(
    "/telegram/anonget/:nullifier",
    async (req: Request, res: Response) => {
      try {
        const nullifierHash = checkUrlParam(req, "nullifier");
        if (!nullifierHash || typeof nullifierHash !== "string") {
          throw new Error(
            "nullifierHash field needs to be a string and be non-empty"
          );
        }
        const messages =
          await telegramService?.handleGetAnonMessages(nullifierHash);
        res.json(messages);
      } catch (e) {
        logger("[TELEGRAM] failed to get posts", e);
      }
    }
  );
}
