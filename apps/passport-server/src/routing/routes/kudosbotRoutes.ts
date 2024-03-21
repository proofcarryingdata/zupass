import {
  SemaphoreSignaturePCD,
  deserialize,
  verify
} from "@pcd/semaphore-signature-pcd";
import express, { Request, Response } from "express";
import { fetchKudosbotProofs } from "../../database/queries/telegram/fetchKudosbotProof";
import { fetchTelegramUsernameFromSemaphoreId } from "../../database/queries/telegram/fetchTelegramUsername";
import { insertKudosbotProof } from "../../database/queries/telegram/insertKudosbotProof";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkQueryParam } from "../params";

export function initKudosbotRoutes(
  app: express.Application,
  context: ApplicationContext,
  _globalServices: GlobalServices
): void {
  logger("[INIT] Initializing Kudosbot routes");

  const deserializeKudosData = (
    kudosData: string
  ): { giver: string; receiver: string } | null => {
    const kudosDataArr = kudosData.split(":");
    if (kudosDataArr.length !== 3 || kudosDataArr[0] !== "KUDOS") {
      return null;
    }
    return { giver: kudosDataArr[1], receiver: kudosDataArr[2] };
  };

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
    const proof = checkQueryParam(req, "proof");

    let pcd: SemaphoreSignaturePCD;
    try {
      pcd = await deserialize(JSON.parse(proof).pcd);
    } catch (e) {
      return res.status(400).send("Error: proof deserialization error.");
    }

    const pcdValid = await verify(pcd);
    if (!pcdValid) {
      return res.status(400).send("Error: proof is not valid.");
    }

    const kudosGiverSemaphoreId = pcd.claim.identityCommitment;
    const kudosDataRaw = pcd.claim.signedMessage;
    const kudosData = deserializeKudosData(kudosDataRaw);
    if (!kudosData) {
      return res.status(400).send("Error: not a valid kudos proof.");
    }
    if (kudosData.giver !== kudosGiverSemaphoreId) {
      return res
        .status(400)
        .send(
          "Error: kudos giver semaphore id does not match proof identity commitment"
        );
    }

    await insertKudosbotProof(context.dbPool, proof);

    res
      .status(200)
      .send(
        `Received valid kudos proof: ${kudosData.giver} gave a kudos to ${kudosData.receiver}. Giver semaphore id: ${kudosGiverSemaphoreId}`
      );
  });
}
