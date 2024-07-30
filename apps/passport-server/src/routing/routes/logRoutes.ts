import express, { Request, Response } from "express";
import { flatten } from "flat";
import { traced } from "../../services/telemetryService";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initLogRoutes(
  app: express.Application,
  _context: ApplicationContext,
  _services: GlobalServices
): void {
  logger("[INIT] initializing log routes");

  /**
   * Lets the Zupass client log stuff to honeycomb.
   *
   * @todo rate limit this.
   */
  app.post("/client-log", (req: Request, res: Response) => {
    traced("ClientLog", "log", async (span) => {
      const flattenedBody = flatten({ client: req.body }) as Record<
        string,
        string | number
      >;

      logger("[CLIENT_LOG]", JSON.stringify(flattenedBody));

      for (const entry of Object.entries(flattenedBody)) {
        span?.setAttribute(entry[0], entry[1]);
      }
    });

    res.sendStatus(200);
  });
}
