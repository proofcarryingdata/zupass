import {
  PendingPCDStatus,
  ProveRequest,
  VerifyRequest,
} from "@pcd/passport-interface";
import express, { NextFunction, Request, Response } from "express";
import {
  enqueueProofRequest,
  getPendingPCDResult,
  getPendingPCDStatus,
  getSupportedPCDTypes,
  initPackages,
  serverVerify,
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
        const pending = await enqueueProofRequest(request);
        res.status(200).json(pending);
      } catch (e) {
        next(e);
      }
    }
  );

  app.post(
    "/pcds/verify",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const verifyRequest: VerifyRequest = req.body;
        const response = await serverVerify(verifyRequest);
        res.status(200).json(response);
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

  app.get(
    "/pcds/status/:hash",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const hash = req.params.hash;
        const status = getPendingPCDStatus(hash);
        if (status === PendingPCDStatus.COMPLETE) {
          res.status(200).json({
            status: PendingPCDStatus.COMPLETE,
            proof: getPendingPCDResult(hash).serializedPCD,
          });
        } else if (status === PendingPCDStatus.ERROR) {
          res.status(500).json({
            status: PendingPCDStatus.ERROR,
          });
        } else {
          res.status(400).json({
            status,
          });
        }
      } catch (e) {
        next(e);
      }
    }
  );
}
