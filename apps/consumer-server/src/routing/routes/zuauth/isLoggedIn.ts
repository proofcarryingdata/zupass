import express, { Request, Response } from "express";
import { getIronSession } from "iron-session";
import { ApplicationContext } from "../../../types";
import { SessionData } from "../../types";

export function isLoggedIn(
  app: express.Application,
  { ironOptions }: ApplicationContext
): void {
  app.get("/auth/logged-in", async (req: Request, res: Response) => {
    const session = await getIronSession<SessionData>(req, res, ironOptions);
    res.status(200).send(session.ticket ?? false);
  });
}
