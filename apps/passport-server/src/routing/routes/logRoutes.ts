import express, { Request, Response } from "express";
import { traced } from "../../services/telemetryService";
import { GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initLogRoutes(
  app: express.Application,
  { authService }: GlobalServices
): void {
  logger("[INIT] initializing log routes");

  /**
   * Lets the Zupass client log stuff to honeycomb.
   *
   * @todo rate limit this.
   */
  app.post(
    "/client-log",
    authService.requireJWTAuthMiddleware,
    (req: Request, res: Response) => {
      traced("ClientLog", "log", async (span) => {
        for (const entry of Object.entries(
          req.body as Record<string, string | number>
        )) {
          span?.setAttribute("client." + entry[0], entry[1]);
        }
        logger("[CLIENT_LOG]", JSON.stringify(req.body));
      });

      res.sendStatus(200);
    }
  );
}
