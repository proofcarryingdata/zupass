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
  console.log("initPCDRoutes finished initPackages()");

  console.log("initPCDRoutes setting up /pcds/prove");
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

  console.log("initPCDRoutes setting up /pcds/supported");
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

  console.log("initPCDRoutes setting up /pcds/status");
  app.post(
    "/pcds/status",
    async (req: Request, res: Response, next: NextFunction) => {
      console.log("/pcds/status received:", req.body);
      const statusRequest = req.body as StatusRequest;
      try {
        const statusResponse: StatusResponse = getPendingPCDStatus(
          statusRequest.hash
        );
        res.json(statusResponse);
      } catch (e) {
        console.error("/pcds/status error:", e);
        next(e);
      }
    }
  );
}
