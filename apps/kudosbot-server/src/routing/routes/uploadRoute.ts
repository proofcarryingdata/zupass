import {
  SemaphoreSignaturePCD,
  deserialize,
  verify
} from "@pcd/semaphore-signature-pcd";
import express, { Request, Response } from "express";
import { ApplicationContext } from "../../types";

export function initUploadRoute(
  app: express.Application,
  _context: ApplicationContext
): void {
  console.log("[INIT] Initializing upload route");

  const deserializeKudosData = (kudosData: string) => {
    const kudosDataArr = kudosData.split(":");
    if (kudosDataArr.length !== 3 || kudosDataArr[0] !== "KUDOS") {
      return null;
    }
    return { giver: kudosDataArr[1], receiver: kudosDataArr[2] };
  };

  app.get("/upload", async (req: Request, res: Response) => {
    const proof = req.query.proof;
    if (typeof proof !== "string") {
      return res.status(200).send("Error: no proof was uploaded.");
    }

    let pcd: SemaphoreSignaturePCD;
    try {
      pcd = await deserialize(JSON.parse(proof).pcd);
    } catch (e) {
      return res.status(200).send("Error: proof deserialization error.");
    }

    const pcdValid = await verify(pcd);
    if (!pcdValid) {
      return res.status(200).send("Error: proof is not valid.");
    }

    const kudosGiverSemaphoreId = pcd.claim.identityCommitment;
    const kudosDataRaw = pcd.claim.signedMessage;
    const kudosData = deserializeKudosData(kudosDataRaw);
    if (!kudosData) {
      return res.status(400);
    }

    res
      .status(200)
      .send(
        `Received valid kudos proof: ${kudosData.giver} gave a kudos to ${kudosData.receiver}. Giver semaphore id: ${kudosGiverSemaphoreId}`
      );
  });
}
