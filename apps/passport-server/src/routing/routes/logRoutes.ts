import express, { Request, Response } from "express";
import { traced } from "../../services/telemetryService";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";

export function initLogRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  logger("[INIT] initializing log routes");

  app.post("/client-log", (req: Request, res: Response) => {
    traced("ClientLog", "log", async (span) => {
      span?.setAttribute("client_log", req.body);
      logger("[CLIENT_LOG]", JSON.stringify(req.body));
    });
    res.sendStatus(200);
  });
}
