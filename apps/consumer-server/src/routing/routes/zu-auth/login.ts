import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { requestKnownTicketTypes } from "@pcd/passport-interface";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import express, { Request, Response } from "express";
import { ApplicationContext } from "../../../types";

const nullifiers = new Set<string>();

/**
 * The login checks the validity of the Semaphore Signature PCD and the EdDSA
 * Ticket PCD, ensures that the ticket is indeed supported by Zupass, and
 * that it has been signed with the correct EdDSA key.
 * The nonce is used as a nullifier in the authentication mechanism so that
 * the same nonce cannot be used to login multiple times.
 */
export function login(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.post("/auth/login", async (req: Request, res: Response) => {
    try {
      if (!req.body.pcd) {
        console.error(`[ERROR] No PCD specified`);

        res.status(400).send();
        return;
      }

      const semaphoreSignaturePCD =
        await SemaphoreSignaturePCDPackage.deserialize(req.body.pcd);

      if (!(await SemaphoreSignaturePCDPackage.verify(semaphoreSignaturePCD))) {
        console.error(`[ERROR] Semaphore signature PCD is not valid`);

        res.status(401).send();
        return;
      }

      const [serializedEdESATicketPCD, nonce] =
        semaphoreSignaturePCD.claim.signedMessage.split("+");

      await EdDSATicketPCDPackage.init?.({});

      const eddsaTicketPCD = await EdDSATicketPCDPackage.deserialize(
        serializedEdESATicketPCD
      );

      if (!(await EdDSATicketPCDPackage.verify(eddsaTicketPCD))) {
        console.error(`[ERROR] EdDSA ticket PCD is not valid`);

        res.status(401).send();
        return;
      }

      if (
        semaphoreSignaturePCD.claim.identityCommitment !==
        eddsaTicketPCD.claim.ticket.attendeeSemaphoreId
      ) {
        console.error(`[ERROR] Semaphore identity does not match`);

        res.status(401).send();
        return;
      }

      if (nonce !== req.session.nonce) {
        console.error(`[ERROR] PCD nonce doesn't match`);

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

      const isValidTicket = value.knownTicketTypes.some((ticketType: any) => {
        return (
          ticketType.eventId === eddsaTicketPCD.claim.ticket.eventId &&
          ticketType.productId === eddsaTicketPCD.claim.ticket.productId &&
          ticketType.publicKey[0] ===
            eddsaTicketPCD.proof.eddsaPCD.claim.publicKey[0] &&
          ticketType.publicKey[1] ===
            eddsaTicketPCD.proof.eddsaPCD.claim.publicKey[1]
        );
      });

      if (!isValidTicket) {
        console.error(`[ERROR] PCD ticket doesn't exist on Zupass`);

        res.status(401).send();
        return;
      }

      // The PCD's nonce is saved as a nullifier so that it prevents the
      // same PCD from being reused for another login.
      nullifiers.add(nonce);

      req.session.user = semaphoreSignaturePCD.claim.identityCommitment;

      await req.session.save();

      res.status(200).send();
    } catch (error: any) {
      console.error(`[ERROR] ${error.message}`);

      res.sendStatus(500);
    }
  });
}