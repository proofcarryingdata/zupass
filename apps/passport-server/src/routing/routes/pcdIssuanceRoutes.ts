import {
  CheckInRequest,
  CheckTicketRequest,
  GetSubscriptionInfosResponse,
  IssuedPCDsRequest
} from "@pcd/passport-interface";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initPCDIssuanceRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { rollbarService, issuanceService }: GlobalServices
): void {
  logger("[INIT] initializing PCD issuance routes");

  app.get("/issue/enabled", async (req: Request, res: Response) => {
    res.json(issuanceService != null);
  });

  app.get("/issue/public-key", async (req: Request, res: Response) => {
    try {
      if (!issuanceService) {
        throw new Error("issuance service not instantiated");
      }
      res.send(issuanceService.getPublicKey());
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });

  app.get("/issuance/feeds", async (req: Request, res: Response) => {
    const response: GetSubscriptionInfosResponse = {
      infos: [
        {
          description: "Get your Devconnect tickets here!",
          id: "1",
          inputPCDType: RSAPCDPackage.name,
          partialArgs: {}
        }
      ]
    };
    res.json(response);
  });

  app.post("/issue/", async (req: Request, res: Response) => {
    try {
      if (!issuanceService) {
        throw new Error("issuance service not instantiated");
      }

      const request = req.body as IssuedPCDsRequest;
      const response = await issuanceService.handleIssueRequest(request);
      res.status(200).json(response);
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });

  app.post("/issue/check-ticket", async (req: Request, res: Response) => {
    try {
      if (!issuanceService) {
        throw new Error("issuance service not instantiated");
      }

      const request = req.body as CheckTicketRequest;
      const response = await issuanceService.handleCheckTicketRequest(request);
      res.status(200).json(response);
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });

  app.post("/issue/check-in", async (req: Request, res: Response) => {
    try {
      if (!issuanceService) {
        throw new Error("issuance service not instantiated");
      }

      const request = req.body as CheckInRequest;
      const response = await issuanceService.handleCheckInRequest(request);
      res.status(200).json(response);
    } catch (e) {
      rollbarService?.reportError(e);
      logger(e);
      res.sendStatus(500);
    }
  });
}
