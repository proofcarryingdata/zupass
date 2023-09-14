import express, { Request, Response } from "express";
import { fetchStatus } from "../../database/queries/fetchStatus";
import { PretixSyncStatus } from "../../services/types";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initStatusRoutes(
  app: express.Application,
  { dbPool }: ApplicationContext,
  {
    semaphoreService,
    pretixSyncService,
    devconnectPretixSyncService
  }: GlobalServices
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
    if (pretixSyncService) {
      res.send(
        pretixSyncService.hasCompletedSyncSinceStarting
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
   * @todo delete this? - nobody uses it. we have better monitoring tools now.
   */
  app.get("/zuzalu/status", async (req: Request, res: Response) => {
    const db = await fetchStatus(dbPool);
    const poolStatus = {
      total: dbPool.totalCount,
      idle: dbPool.idleCount,
      waiting: dbPool.waitingCount
    };
    const semaphoreStatus = {
      n_participants: semaphoreService.groupParticipants().group.members.length,
      n_residents: semaphoreService.groupResidents().group.members.length,
      n_visitors: semaphoreService.groupVisitors().group.members.length
    };
    const time = new Date().toISOString();
    const status = {
      time,
      db,
      db_pool: poolStatus,
      semaphore: semaphoreStatus
    };

    res.json(status);
  });

  /**
   * @todo delete this? same as /zuzalu/status
   */
  app.get("/pcdpass/status", async (req: Request, res: Response) => {
    const db = await fetchStatus(dbPool);
    const db_pool = {
      total: dbPool.totalCount,
      idle: dbPool.idleCount,
      waiting: dbPool.waitingCount
    };
    const semaphore = {
      n_participants: semaphoreService.groupParticipants().group.members.length,
      n_residents: semaphoreService.groupResidents().group.members.length,
      n_visitors: semaphoreService.groupVisitors().group.members.length
    };
    const time = new Date().toISOString();
    res.json({ time, db, db_pool, semaphore });
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
