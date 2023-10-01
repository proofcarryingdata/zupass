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

    const kudosGiver = pcd.claim.identityCommitment;
    const kudosReceiver = pcd.claim.signedMessage;

    res
      .status(200)
      .send(
        `Received valid kudos proof: ${kudosGiver} gave a kudos to ${kudosReceiver}`
      );
  });
}
