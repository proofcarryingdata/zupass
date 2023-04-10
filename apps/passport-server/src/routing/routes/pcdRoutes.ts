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

export function initPCDRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  initPackages();

  app.post(
    "/pcds/prove",
    async (req: Request, res: Response, next: NextFunction) => {
      console.log("/pcds/prove received:", req.body);
      const request = req.body as ProveRequest;
      try {
        const pending: PendingPCD = await enqueueProofRequest(request);
        res.json(pending);
      } catch (e) {
        console.error("/pcds/prove error: ", e);
        next(e);
      }
    }
  );

  app.get(
    "/pcds/supported",
    async (req: Request, res: Response, next: NextFunction) => {
      res.setHeader("Access-Control-Allow-Origin", "*");
      try {
        res.json(getSupportedPCDTypes());
      } catch (e) {
        console.error("/pcds/supported error: ", e);
        next(e);
      }
    }
  );

  app.post(
    "/pcds/status",
    async (req: Request, res: Response, next: NextFunction) => {
      console.log("/pcds/status received:", req.body);
      const statusRequest = req.body as StatusRequest;
      try {
        const statusResponse: StatusResponse = getPendingPCDStatus(
          statusRequest.hash
        );
        console.log("Status Response", statusResponse);
        res.json(statusResponse);
      } catch (e) {
        console.error("/pcds/status error:", e);
        next(e);
      }
    }
  );
}
