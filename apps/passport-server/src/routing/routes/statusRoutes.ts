import express, { Request, Response } from "express";
import { fetchStatus } from "../../database/queries/fetchStatus";
import { ApplicationContext, GlobalServices } from "../../types";

export function initStatusRoutes(
  app: express.Application,
  context: ApplicationContext,
  { semaphoreService, pretixSyncService }: GlobalServices
) {
  console.log("[INIT] Initializing status routes");
  const { dbPool } = context;

  app.get("/pretix/status", async (req: Request, res: Response) => {
    res.send(pretixSyncService?.hasCompletedSyncSinceStarting);
  });

  app.get("/zuzalu/status", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const db = await fetchStatus(dbPool);
    const db_pool = {
      total: dbPool.totalCount,
      idle: dbPool.idleCount,
      waiting: dbPool.waitingCount,
    };
    const semaphore = {
      n_participants: semaphoreService.groupParticipants().group.members.length,
      n_residents: semaphoreService.groupResidents().group.members.length,
      n_visitors: semaphoreService.groupVisitors().group.members.length,
    };
    const time = new Date().toISOString();

    const status = { time, db, db_pool, semaphore };

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(status, null, 2));
  });

  app.get("/pcdpass/status", async (req: Request, res: Response) => {
    res.setHeader("Access-Control-Allow-Origin", "*");
    const db = await fetchStatus(dbPool);
    const db_pool = {
      total: dbPool.totalCount,
      idle: dbPool.idleCount,
      waiting: dbPool.waitingCount,
    };
    const semaphore = {
      n_participants: semaphoreService.groupParticipants().group.members.length,
      n_residents: semaphoreService.groupResidents().group.members.length,
      n_visitors: semaphoreService.groupVisitors().group.members.length,
    };
    const time = new Date().toISOString();

    const status = { time, db, db_pool, semaphore };

    res.setHeader("Content-Type", "application/json");
    res.end(JSON.stringify(status, null, 2));
  });
}
