import express, { Request, Response } from "express";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";

export function initHealthcheckRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  logger("[INIT] initializing health check routes");

  /**
   * Used by render.com to detect whether the backend is ready,
   * so that it can kill the other instance during a deploy (which
   * enables zero-downtime deploys).
   *
   * render.com also uses this as a health check to detect wither
   * the backend has gone down in order to be able to restart it
   * when necessary.
   */
  app.get("/", async (req: Request, res: Response) => {
    res.status(200).send("Zupass Server - OK!");
  });
}
