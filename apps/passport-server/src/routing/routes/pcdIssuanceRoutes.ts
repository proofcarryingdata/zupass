import { IssuedPCDsRequest } from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initPCDIssuanceRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { rollbarService, issuanceService }: GlobalServices
): void {
  logger("[INIT] initializing PCD issuance routes");

  app.post("/issue/", async (req: Request, res: Response) => {
    try {
      if (!issuanceService) {
        throw new Error("issuance service not instantiated");
      }

      const request = req.body as IssuedPCDsRequest;
      const response = await issuanceService.handleRequest(request);
      res.status(200).json(response);
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });
}
