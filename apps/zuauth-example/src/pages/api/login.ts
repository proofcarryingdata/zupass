import { SessionData, ironOptions } from "@/config/iron";
import { eventTicketMetadata } from "@/metadata";
import { isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import { getIronSession } from "iron-session";
import { NextApiRequest, NextApiResponse } from "next";

const nullifiers = new Set<string>();

/**
 * The login checks the validity of the PCD and ensures that the ticket
 * has been issued by Zupass. The watermark used to create the PCD must equal
 * the watermark of the current session.
 * The PCD nullifier is saved to prevent the same PCD from being used for another login.
 */
export default async function Login(req: NextApiRequest, res: NextApiResponse) {
  const session = await getIronSession<SessionData>(req, res, ironOptions);
  const { publicKey, eventId } = eventTicketMetadata;
  try {
    if (!req.body.pcd) {
      console.error(`[ERROR] No PCD specified`);

      res.status(400).send("No PCD specified");
      return;
    }

    const serializedPCD = JSON.parse(req.body.pcd);
    const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(
      serializedPCD.pcd
    );

    if (!(await ZKEdDSAEventTicketPCDPackage.verify(pcd))) {
      console.error(`[ERROR] ZK ticket PCD is not valid`);

      res.status(401).send("ZK ticket PCD is not valid");
      return;
    }

    if (!isEqualEdDSAPublicKey(publicKey, pcd.claim.signer)) {
      console.error(`[ERROR] PCD is not signed by the correct key`);

      res.status(401).send("PCD is not signed by the correct key");
      return;
    }

    if (pcd.claim.watermark.toString() !== session.watermark) {
      console.error(`[ERROR] PCD watermark doesn't match`);

      res.status(401).send("PCD watermark doesn't match");
      return;
    }

    if (!pcd.claim.nullifierHash) {
      console.error(`[ERROR] PCD ticket nullifier has not been defined`);

      res.status(401).send("PCD ticket nullifer has not been defined");
      return;
    }

    if (nullifiers.has(pcd.claim.nullifierHash)) {
      console.error(`[ERROR] PCD ticket has already been used`);

      res.status(401).send("PCD ticket has already been used");
      return;
    }

    if (pcd.claim.partialTicket.eventId !== eventId) {
      console.error(
        `[ERROR] PCD ticket has an unsupported event ID: ${eventId}`
      );

      res.status(400).send("PCD ticket is not for a supported event");
      return;
    }

    // The PCD's nullifier is saved so that it prevents the
    // same PCD from being reused for another login.
    nullifiers.add(pcd.claim.nullifierHash);

    // Save the ticket's data.
    session.user = pcd.claim.partialTicket;

    await session.save();

    res
      .status(200)
      .send({ user: session.user, nullifier: pcd.claim.nullifierHash });
  } catch (error: any) {
    console.error(`[ERROR] ${error}`);

    res.status(500).send(`Unknown error: ${error.message}`);
  }
}
