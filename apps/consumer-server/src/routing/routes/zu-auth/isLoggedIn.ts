import express, { Request, Response } from "express";
import { ApplicationContext } from "../../../types";

export function isLoggedIn(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.get("/auth/logged-in", async (req: Request, res: Response) => {
    res.status(200).send(!!req.session.user);
  });
}
