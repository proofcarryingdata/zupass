import express, { Request, Response } from "express";
import { flatten } from "flat";
import { traced } from "../../services/telemetryService";
import { logger } from "../../util/logger";

export function initLogRoutes(app: express.Application): void {
  logger("[INIT] initializing log routes");

  /**
   * Lets the Zupass client log stuff to honeycomb.
   *
   * @todo rate limit this.
   */
  app.post("/client-log", (req: Request, res: Response) => {
    traced("ClientLog", "log", async (span) => {
      if (req.body.name === "protocol_worlds_score") {
        const score = req.body.score;
        const commitment = req.body.commitment;
      }

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
