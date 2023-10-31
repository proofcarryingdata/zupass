import express, { Request, Response } from "express";
import { ApplicationContext } from "../../../types";

export function logout(
  app: express.Application,
  _context: ApplicationContext
): void {
  app.delete("/auth/logout", async (req: Request, res: Response) => {
    try {
      req.session.destroy();

      res.status(200).send();
    } catch (error) {
      console.error(`[ERROR] ${error}`);

      res.send(500);
    }
  });
}
