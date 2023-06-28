import express, { Request, Response } from "express";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";

export function initHealthcheckRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  logger("[INIT] Initializing health check routes");

  app.get("/", async (req: Request, res: Response) => {
    res.send("PCD Passport Server - OK!");
  });
}
