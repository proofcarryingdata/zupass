import {
  PendingPCD,
  ProveRequest,
  StatusRequest,
  StatusResponse,
} from "@pcd/passport-interface";
import express, { NextFunction, Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";

export function initPCDRoutes(
  app: express.Application,
  _context: ApplicationContext,
  globalServices: GlobalServices
): void {
  const { provingService } = globalServices;

  app.post(
    "/pcds/prove",
    async (req: Request, res: Response, next: NextFunction) => {
      logger("/pcds/prove received:", req.body);
      const request = req.body as ProveRequest;
      try {
        const pending: PendingPCD = await provingService.enqueueProofRequest(
          request
        );
        res.json(pending);
      } catch (e) {
        logger("/pcds/prove error: ", e);
        next(e);
      }
    }
  );

  app.get(
    "/pcds/supported",
    async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      try {
        res.json(provingService.getSupportedPCDTypes());
      } catch (e) {
        logger("/pcds/supported error: ", e);
        next(e);
      }
    }
  );

  app.post(
    "/pcds/status",
    async (req: Request, res: Response, next: NextFunction) => {
      logger("/pcds/status received:", req.body);
      const statusRequest = req.body as StatusRequest;
      try {
        const statusResponse: StatusResponse =
          provingService.getPendingPCDStatus(statusRequest.hash);
        res.json(statusResponse);
      } catch (e) {
        logger("/pcds/status error:", e);
        next(e);
      }
    }
  );
}
