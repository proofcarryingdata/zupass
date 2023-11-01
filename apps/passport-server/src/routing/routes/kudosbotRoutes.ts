import { deserialize, verify } from "@pcd/semaphore-signature-kudos-pcd";
import express, { Request, Response } from "express";
import { fetchKudosbotProofs } from "../../database/queries/telegram/fetchKudosbotProof";
import { fetchTelegramUsernameFromSemaphoreId } from "../../database/queries/telegram/fetchTelegramUsername";
import { insertKudosbotProof } from "../../database/queries/telegram/insertKudosbotProof";
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
  { rollbarService }: GlobalServices
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

      const pcd = await deserialize(JSON.parse(proof).pcd);

      const pcdValid = await verify(pcd);
      if (!pcdValid) {
        return res.status(400).send("Error: proof is not valid.");
      }

      const kudosGiverSemaphoreId = pcd.claim.data.giver.semaphoreID;

      if (
        pcd.proof.semaphoreSignaturePCD.claim.identityCommitment !=
        kudosGiverSemaphoreId
      ) {
        return res
          .status(400)
          .send(
            "Error: kudos giver semaphore id does not match proof identity commitment"
          );
      }

      await insertKudosbotProof(context.dbPool, proof);
      // Have bot send message

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
