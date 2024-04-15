import { generateSnarkMessageHash } from "@pcd/util";
import { authenticate } from "@pcd/zuauth";
import express, { Request, Response } from "express";
import { getIronSession } from "iron-session";
import { ApplicationContext } from "../../../types";
import { SessionData } from "../../types";

/**
 * Checks that the PCD is valid by calling ZuAuth's {@link authenticate}
 * function, then saves the ticket data to session storage if valid.
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
