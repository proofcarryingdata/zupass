import { LoadE2EERequest, SaveE2EERequest } from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";

export function initE2EERoutes(
  app: express.Application,
  _context: ApplicationContext,
  globalServices: GlobalServices
) {
  app.post("/sync/load/", async (req: Request, res: Response) => {
    const { e2eeService } = globalServices;
    const request = req.body as LoadE2EERequest;

    if (request.blobKey === undefined) {
      throw new Error("Can't load e2ee: missing blobKey");
    }

    await e2eeService.handleLoad(request, res);
  });

  app.post("/sync/save", async (req: Request, res: Response) => {
    const { e2eeService } = globalServices;
    const request = req.body as SaveE2EERequest;
    await e2eeService.handleSave(request, res);
  });
}
