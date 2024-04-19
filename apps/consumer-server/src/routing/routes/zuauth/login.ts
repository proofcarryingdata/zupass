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
      if (!req.body.pcd || !req.body.config) {
        console.error(`[ERROR] Missing PCD or config`);

        res.sendStatus(400);
        return;
      }

      if (!session.watermark) {
        res.send("Missing watermark in session").sendStatus(400);
        return;
      }

      const pcd = await authenticate(
        req.body.pcd,
        session.watermark,
        req.body.config
      );

      session.ticket = pcd.claim.partialTicket;

      await session.save();

      res.status(200).send(session.ticket);
    } catch (error) {
      console.error(`[ERROR] ${error}`);

      res.sendStatus(500);
    }
  });
}
