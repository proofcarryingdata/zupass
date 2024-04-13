import { requestKnownTicketTypes } from "@pcd/passport-interface";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import express, { Request, Response } from "express";
import { getIronSession } from "iron-session";
import { ApplicationContext } from "../../../types";
import { SessionData } from "../../types";

const nullifiers = new Set<string>();

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
      if (!req.body.pcd) {
        console.error(`[ERROR] No PCD specified`);

        res.status(400).send();
        return;
      }

      const pcd = await ZKEdDSAEventTicketPCDPackage.deserialize(req.body.pcd);

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

      // It fetches the ticket types from Zupass to verify whether the PCD ticket
      // is indeed among the supported tickets and has been signed with the key from the Zupass server.
      const { value } = await requestKnownTicketTypes(
        // eslint-disable-next-line turbo/no-undeclared-env-vars
        process.env.ZUPASS_API as string
      );

      if (!value) {
        console.error(`[ERROR] Request to Zupass server was not successful`);

        res.status(500).send();
        return;
      }

      const isValidTicket = value.knownTicketTypes.some((ticketType) => {
        return (
          (!pcd.claim.partialTicket.eventId ||
            ticketType.eventId === pcd.claim.partialTicket.eventId) &&
          (!pcd.claim.partialTicket.productId ||
            ticketType.productId === pcd.claim.partialTicket.productId) &&
          ticketType.publicKey[0] === pcd.claim.signer[0] &&
          ticketType.publicKey[1] === pcd.claim.signer[1]
        );
      });

      if (!isValidTicket) {
        console.error(`[ERROR] PCD ticket doesn't exist on Zupass`);

        res.status(401).send();
        return;
      }

      // The PCD's nullifier is saved so that it prevents the
      // same PCD from being reused for another login.
      nullifiers.add(pcd.claim.nullifierHash);

      // Save the data related to the fields revealed during the generation
      // of the zero-knowledge proof.
      session.ticket = pcd.claim.partialTicket;

      await session.save();

      res.status(200).send(session.ticket);
    } catch (error) {
      if (error instanceof Error) {
        console.error(`[ERROR] ${error.message}`);
      }

      res.sendStatus(500);
    }
  });
}
