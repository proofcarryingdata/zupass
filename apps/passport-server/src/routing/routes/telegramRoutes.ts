import { AnonWebAppPayload, PayloadType } from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { namedSqlTransaction, sqlTransaction } from "../../database/sqlQuery";
import { startTelegramService } from "../../services/telegramService";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import {
  closeWebviewHtml,
  errorHtmlWithDetails
} from "../../util/telegramWebApp";
import {
  checkOptionalQueryParam,
  checkQueryParam,
  checkUrlParam
} from "../params";

export function initTelegramRoutes(
  app: express.Application,
  context: ApplicationContext,
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
    [
      "/telegram/verify",
      "/telegram/verify/:id",
      "/telegram/verify/:id/:username"
    ],
    async (req: Request, res: Response) => {
      try {
        const proof = checkQueryParam(req, "proof");
        const telegram_user_id = checkOptionalQueryParam(req, "userId");
        const telegram_chat_id = checkOptionalQueryParam(req, "chatId");
        const telegram_username = checkOptionalQueryParam(req, "username");

        if (!telegram_chat_id || !telegram_chat_id)
          throw new Error(
            `Missing chat Id or user Id. Type /start and try again.`
          );

        if (!telegramService) {
          throw new Error("Telegram service not initialized");
        }

        if (!telegram_user_id || !/^-?\d+$/.test(telegram_user_id)) {
          throw new Error(
            "telegram_user_id field needs to be a numeric string and be non-empty"
          );
        }

        logger(
          `[TELEGRAM] Verifying ticket for ${telegram_user_id}` +
            (telegram_username && ` with username ${telegram_username}`)
        );

        if (!telegramService) {
          throw new Error("Telegram service not initialized");
        }
        await namedSqlTransaction(
          context.dbPool,
          "/telegram/verify",
          (client) =>
            telegramService.handleVerification(
              client,
              proof,
              parseInt(telegram_user_id),
              telegram_chat_id,
              telegram_username
            )
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
      const chatId = checkQueryParam(req, "chatId");

      if (!proof || typeof proof !== "string") {
        throw new Error("proof field needs to be a string and be non-empty");
      }

      if (!message || typeof message !== "string") {
        throw new Error("message field needs to be a string and be non-empty");
      }

      if (!topicId || typeof topicId !== "string") {
        throw new Error("topicId field needs to be a string and be non-empty");
      }

      if (!chatId || typeof chatId !== "string") {
        throw new Error("chatId field needs to be a string and be non-empty");
      }

      if (!telegramService) {
        throw new Error("Telegram service not initialized");
      }

      await telegramService.handleSendAnonymousMessage(
        proof,
        message,
        chatId,
        topicId
      );
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
      const tgWebAppStartParam = checkQueryParam(req, "tgWebAppStartParam");
      if (!tgWebAppStartParam) throw new Error(`No start param received`);
      if (!telegramService) {
        throw new Error("Telegram service not initialized");
      }

      const isLegacyPayloadType = /^-?\d+_\d+$/.test(tgWebAppStartParam);

      if (isLegacyPayloadType) {
        logger(`[TELEGRAM] handling legacy payload: ${tgWebAppStartParam}`);
        const [chatId, topicId] = tgWebAppStartParam.split("_");
        if (!chatId || !topicId)
          throw new Error(`No chatId or topicId received`);

        const redirectUrl =
          await telegramService.handleRequestAnonymousMessageLink(
            parseInt(chatId),
            parseInt(topicId)
          );

        if (!redirectUrl) throw new Error(`Couldn't load redirect url`);
        logger(`[TELEGRAM] Redirecting for anonymous post to chat ${chatId}`);
        res.redirect(redirectUrl);
        return;
      }

      const anonPayload: AnonWebAppPayload = JSON.parse(
        Buffer.from(tgWebAppStartParam, "base64").toString()
      );

      switch (anonPayload.type) {
        case PayloadType.RedirectTopicData: {
          const { chatId, topicId } = anonPayload.value;
          if (!chatId || !topicId)
            throw new Error(`No chatId or topicId received`);

          const redirectUrl =
            await telegramService.handleRequestAnonymousMessageLink(
              chatId,
              topicId
            );

          if (!redirectUrl) throw new Error(`Couldn't load redirect url`);
          logger(`[TELEGRAM] Redirecting for anonymous post to chat ${chatId}`);
          res.redirect(redirectUrl);
          break;
        }

        case PayloadType.NullifierHash: {
          logger(
            `[TELEGRAM] Redirecting for anonymous profile for nullifier hash ${anonPayload.value}`
          );
          if (!process.env.TELEGRAM_ANON_WEBSITE) {
            throw new Error(
              "TELEGRAM_ANON_WEBSITE environment variable not set"
            );
          }
          res.redirect(
            `${process.env.TELEGRAM_ANON_WEBSITE}/profile?nullifierHash=${anonPayload.value}`
          );
          break;
        }

        case PayloadType.ReactData: {
          const proofUrl = await sqlTransaction(context.dbPool, (client) =>
            telegramService.handleRequestReactProofLink(client, anonPayload)
          );
          res.redirect(proofUrl);
          break;
        }

        default: {
          throw new Error(
            `Unhandled payload type ${(anonPayload as AnonWebAppPayload).type}`
          );
        }
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
        if (!telegramService) {
          throw new Error("Telegram service not initialized");
        }
        const nullifierHash = checkUrlParam(req, "nullifier");
        if (!nullifierHash || typeof nullifierHash !== "string") {
          throw new Error(
            "nullifierHash field needs to be a string and be non-empty"
          );
        }
        await namedSqlTransaction(
          context.dbPool,
          "/telegram/anonget/:nullifier",
          async (client) => {
            const messages = await telegramService.handleGetAnonMessages(
              client,
              nullifierHash
            );
            const totalKarma = await telegramService.handleGetAnonTotalKarma(
              client,
              nullifierHash
            );
            res.json({ messages, totalKarma });
          }
        );
      } catch (e) {
        logger("[TELEGRAM] failed to get posts", e);
      }
    }
  );

  app.get("/telegram/anonreact", async (req: Request, res: Response) => {
    try {
      const proof = checkQueryParam(req, "proof");
      const chatId = checkQueryParam(req, "chatId");
      const anonMessageId = checkQueryParam(req, "anonMessageId");
      const reaction = checkQueryParam(req, "reaction");

      if (!telegramService) {
        throw new Error("Telegram service not initialized");
      }

      await namedSqlTransaction(
        context.dbPool,
        "/telegram/anonreact",
        (client) =>
          telegramService.handleReactAnonymousMessage(
            client,
            proof,
            chatId,
            anonMessageId,
            reaction
          )
      );

      res.setHeader("Content-Type", "text/html");
      res.send(closeWebviewHtml);
    } catch (e) {
      logger("[TELEGRAM] failed to verify", e);
      rollbarService?.reportError(e);
      res.set("Content-Type", "text/html");
      res.status(500).send(errorHtmlWithDetails(e as Error));
    }
  });

  app.get("/telegram/bot", async (req: Request, res: Response) => {
    if (!telegramService) {
      throw new Error("Telegram service not initialized");
    }
    const ping = telegramService.ping();
    if (ping) return res.status(200).send(`Auth bot is running`);
    if (!ping) {
      logger(`[TELEGRAM] stopping bots`);
      await telegramService.stop();
      logger(`[TELEGRAM] restarting bots`);
      startTelegramService(context, null, null);
      res.status(200).send(`Started bots`);
    }
  });
}
