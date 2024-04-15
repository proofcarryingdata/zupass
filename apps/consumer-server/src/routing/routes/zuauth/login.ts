import { generateSnarkMessageHash } from "@pcd/util";
import { authenticate } from "@pcd/zuauth";
import express, { Request, Response } from "express";
import { getIronSession } from "iron-session";
import { ApplicationContext } from "../../../types";
import { SessionData } from "../../types";

/**
 * The login checks the validity of the PCD, ensures that the ticket
 * is indeed supported by Zupass, and that it has been signed with the correct
 * EdDSA key. The watermark used to create the PCD and as a nonce in the
 * authentication mechanism must be the same as the one in the current session.
 * Once all checks are passed, a user session is created in which the watermark
 * and nullifier are saved.
 */
export function login(
  app: express.Application,
  { ironOptions }: ApplicationContext
): void {
  app.post("/auth/login", async (req: Request, res: Response) => {
    const session = await getIronSession<SessionData>(req, res, ironOptions);
    try {
      if (!req.body.pcd || !req.body.eventMetadata) {
        console.error(`[ERROR] Missing PCD or event metadata`);

        res.status(400).send();
        return;
      }

      const pcd = await authenticate(
        req.body.pcd,
        session.watermark ?? generateSnarkMessageHash("").toString(),
        req.body.eventMetadata
      );

      /*  const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(req.body.pcd);

      if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
        console.error(`[ERROR] ZK ticket PCD is not valid`);

        res.status(401).send();
        return;
      }

      if (pcd.claim.watermark.toString() !== session.watermark) {
        console.error(`[ERROR] PCD watermark doesn't match`);

        res.status(401).send();
        return;
      }

      if (!pcd.claim.nullifierHash) {
        console.error(`[ERROR] PCD ticket nullifier has not been defined`);

        res.status(401).send();
        return;
      }

      if (nullifiers.has(pcd.claim.nullifierHash)) {
        console.error(`[ERROR] PCD ticket has already been used`);

        res.status(401).send();
        return;
      }

      // The PCD's nullifier is saved so that it prevents the
      // same PCD from being reused for another login.
      nullifiers.add(pcd.claim.nullifierHash);*/

      // Save the data related to the fields revealed during the generation
      // of the zero-knowledge proof.
      session.ticket = pcd.claim.partialTicket;

      await session.save();

      res.status(200).send(session.ticket);
    } catch (error) {
      console.log(JSON.stringify(error, null, 2));
      console.error(`[ERROR] ${error}`);

      res.sendStatus(500);
    }
  });
}
