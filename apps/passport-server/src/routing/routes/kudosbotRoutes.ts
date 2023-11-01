import express, { Request, Response } from "express";
import { fetchKudosbotProofs } from "../../database/queries/telegram/fetchKudosbotProof";
import { fetchTelegramUsernameFromSemaphoreId } from "../../database/queries/telegram/fetchTelegramUsername";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import {
  closeWebviewHtml,
  errorHtmlWithDetails
} from "../../util/telegramWebApp";
import { checkQueryParam } from "../params";

export function initKudosbotRoutes(
  app: express.Application,
  context: ApplicationContext,
  { kudosbotService, rollbarService }: GlobalServices
): void {
  logger("[INIT] Initializing Kudosbot routes");

  app.get("/kudos/list", async (_req: Request, res: Response) => {
    const proofs = await fetchKudosbotProofs(context.dbPool);
    res.status(200).json({ proofs });
  });

  app.get("/kudos/username", async (req: Request, res: Response) => {
    const semaphoreId = checkQueryParam(req, "semaphore_id");
    const username = await fetchTelegramUsernameFromSemaphoreId(
      context.dbPool,
      semaphoreId
    );
    if (username === null) {
      return res.status(400).send("Error: no username for semaphore id.");
    }
    res.status(200).json({ username });
  });

  app.get("/kudos/upload", async (req: Request, res: Response) => {
    try {
      const proof = checkQueryParam(req, "proof");

      if (!kudosbotService) {
        throw new Error("Kudos bot service not initialized");
      }
      await kudosbotService.handleUpload(context, proof);

      res.setHeader("Content-Type", "text/html");
      res.status(200).send(closeWebviewHtml);
    } catch (e) {
      logger("[KUDOSBOT] Failed to upload", e);
      rollbarService?.reportError(e);
      res.set("Content-Type", "text/html");
      res.status(500).send(errorHtmlWithDetails(e as Error));
    }
  });
}
