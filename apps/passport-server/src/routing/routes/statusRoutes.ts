import express, { Request, Response } from "express";
import { PretixSyncStatus } from "../../services/types";
import { GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initStatusRoutes(
  app: express.Application,
  { zuzaluPretixSyncService, devconnectPretixSyncService }: GlobalServices
): void {
  logger("[INIT] initializing status routes");
  const startTime = Date.now();

  /**
   * Returns the current status of the Zuzalu (*not* Devconnect) pretix
   * sync. Used primarly for testing.
   *
   * @todo - should we just get `pretixSyncService.hasCompletedSyncSinceStarting`
   * directly from the service itself in tests? This seems a bit roundabout.
   */
  app.get("/pretix/status", async (req: Request, res: Response) => {
    if (zuzaluPretixSyncService) {
      res.send(
        zuzaluPretixSyncService.hasCompletedSyncSinceStarting
          ? PretixSyncStatus.Synced
          : PretixSyncStatus.NotSynced
      );
    } else {
      res.send(PretixSyncStatus.NoPretix);
    }
  });

  /**
   * Same as /pretix/status but for {@link devconnectPretixSyncService}.
   */
  app.get("/devconnect-pretix/status", async (req: Request, res: Response) => {
    if (devconnectPretixSyncService) {
      res.send(
        devconnectPretixSyncService.hasCompletedSyncSinceStarting
          ? PretixSyncStatus.Synced
          : PretixSyncStatus.NotSynced
      );
    } else {
      res.send(PretixSyncStatus.NoPretix);
    }
  });

  /**
   * Returns the amount of time in seconds this server has been alive.
   */
  app.get("/status/uptime", async (req: Request, res: Response) => {
    const currentTime = Date.now();
    const uptimeSeconds = Math.round((currentTime - startTime) / 1000) + "s";
    res.send(uptimeSeconds);
  });
}
