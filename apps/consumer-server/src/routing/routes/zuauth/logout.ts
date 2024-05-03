import express, { Request, Response } from "express";
import { getIronSession } from "iron-session";
import { ApplicationContext } from "../../../types";
import { SessionData } from "../../types";

export function logout(
  app: express.Application,
  { ironOptions }: ApplicationContext
): void {
  app.delete("/auth/logout", async (req: Request, res: Response) => {
    try {
      const session = await getIronSession<SessionData>(req, res, ironOptions);
      session.destroy();

      res.status(200).send();
    } catch (error) {
      console.error(`[ERROR] ${error}`);

      res.send(500);
    }
  });
}
