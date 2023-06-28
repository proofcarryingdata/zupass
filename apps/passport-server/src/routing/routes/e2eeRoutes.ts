import { LoadE2EERequest, SaveE2EERequest } from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initE2EERoutes(
  app: express.Application,
  _context: ApplicationContext,
  { rollbarService, e2eeService }: GlobalServices
): void {
  logger("[INIT] initializing e2ee routes");

  app.post("/sync/load/", async (req: Request, res: Response) => {
    try {
      const request = req.body as LoadE2EERequest;

      if (request.blobKey === undefined) {
        throw new Error("Can't load e2ee: missing blobKey");
      }

      await e2eeService.handleLoad(request, res);
    } catch (e: any) {
      rollbarService?.error(e);
      logger(e);
      res.sendStatus(500);
    }
  });

  app.post("/sync/save", async (req: Request, res: Response) => {
    try {
      const request = req.body as SaveE2EERequest;
      await e2eeService.handleSave(request, res);
    } catch (e: any) {
      rollbarService?.error(e);
      logger(e);
      res.sendStatus(500);
    }
  });
}
