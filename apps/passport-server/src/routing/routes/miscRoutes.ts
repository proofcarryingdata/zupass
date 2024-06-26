import express, { Request, Response } from "express";
import { kvGetByPrefix } from "../../database/queries/kv";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initMiscRoutes(
  app: express.Application,
  context: ApplicationContext,
  _services: GlobalServices
): void {
  logger("[INIT] initializing misc routes");

  /**
   * Lets the Zupass client log stuff to honeycomb.
   *
   * @todo rate limit this.
   */
  app.get(
    "/misc/protocol-worlds-score",
    async (req: Request, res: Response) => {
      const scores = (await kvGetByPrefix(
        context.dbPool,
        "protocol-worlds-score:"
      )) as Array<{ email: string; score: number }>;

      res.send(scores);
    }
  );
}
