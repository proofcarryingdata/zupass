import {
  PendingPCD,
  ProveRequest,
  StatusRequest,
  StatusResponse,
} from "@pcd/passport-interface";
import express, { NextFunction, Request, Response } from "express";
import {
  enqueueProofRequest,
  getPendingPCDStatus,
  getSupportedPCDTypes,
  initPackages,
} from "../../services/proving";
import { ApplicationContext } from "../../types";

export async function initPCDRoutes(
  app: express.Application,
  _context: ApplicationContext
): Promise<void> {
  await initPackages();

  app.post(
    "/pcds/prove",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const request: ProveRequest = req.body;
        const pending: PendingPCD = await enqueueProofRequest(request);
        res.status(200).json(pending);
      } catch (e) {
        next(e);
      }
    }
  );

  app.get(
    "/pcds/supported",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        res.json(getSupportedPCDTypes());
      } catch (e) {
        next(e);
      }
    }
  );

  app.post(
    "/pcds/status",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const statusRequest: StatusRequest = req.body;
        const statusResponse: StatusResponse = getPendingPCDStatus(
          statusRequest.hash
        );
        res.status(200).json(statusResponse);
      } catch (e) {
        next(e);
      }
    }
  );
}
