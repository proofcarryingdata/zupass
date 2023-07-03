import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import express, { Request, Response } from "express";

import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { decodeString } from "../../util/util";

export function initSemaphoreRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { semaphoreService, rollbarService }: GlobalServices
): void {
  logger("[INIT] initializing semaphore routes");

  app.get(
    "/semaphore/valid-historic/:id/:root",
    async (req: Request, res: Response) => {
      try {
        const id = decodeString(req.params.id, "id");
        const root = decodeString(req.params.root, "root");
        const historicGroupValid =
          await semaphoreService.getHistoricSemaphoreGroupValid(id, root);

        res.json({
          valid: historicGroupValid,
        });
      } catch (e) {
        logger(e);
        rollbarService?.reportError(e);
        res.sendStatus(500);
      }
    }
  );

  app.get(
    "/semaphore/historic/:id/:root",
    async (req: Request, res: Response) => {
      try {
        const id = decodeString(req.params.id, "id");
        const root = decodeString(req.params.root, "root");
        const historicGroup = await semaphoreService.getHistoricSemaphoreGroup(
          id,
          root
        );

        if (historicGroup === undefined) {
          res.status(404);
          res.send("not found");
          return;
        }

        res.json(JSON.parse(historicGroup.serializedGroup));
      } catch (e) {
        logger(e);
        rollbarService?.reportError(e);
        res.sendStatus(500);
      }
    }
  );

  app.get("/semaphore/latest-root/:id", async (req: Request, res: Response) => {
    try {
      const id = decodeString(req.params.id, "id");
      const latestGroups = await semaphoreService.getLatestSemaphoreGroups();
      const matchingGroup = latestGroups.find(
        (g) => g.groupId.toString() === id
      );

      if (matchingGroup === undefined) {
        res.status(404).send("not found");
        return;
      }

      res.json(matchingGroup.rootHash);
    } catch (e) {
      logger(e);
      rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  });

  // Fetch a semaphore group.
  app.get("/semaphore/:id", async (req: Request, res: Response) => {
    try {
      const semaphoreId = decodeString(req.params.id, "id");
      const namedGroup = semaphoreService.getNamedGroup(semaphoreId);

      if (namedGroup == null) {
        res.sendStatus(404);
        res.json(`Missing semaphore group ${semaphoreId}`);
        return;
      }

      res.setHeader("Access-Control-Allow-Origin", "*");
      res.json(serializeSemaphoreGroup(namedGroup.group, namedGroup.name));
    } catch (e) {
      logger(e);
      rollbarService?.reportError(e);
      res.sendStatus(500);
    }
  });
}
