import {
  hashProveRequest,
  PendingPCD,
  ProveRequest,
  StampPCDStatus,
  VerifyRequest,
} from "@pcd/passport-interface";
import express, { NextFunction, Request, Response } from "express";
import {
  getSupportedPCDTypes,
  initPackages,
  prove,
  verify,
} from "../../services/proving";
import { ServerProvingContext } from "../../types";

export async function initPCDRoutes(
  app: express.Application,
  provingContext: ServerProvingContext
): Promise<void> {
  await initPackages();

  app.post(
    "/pcds/prove",
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const proveRequest: ProveRequest = req.body;
        const hash = hashProveRequest(proveRequest);

        // don't add identical proof requests to queue to prevent accidental or
        // malicious DoS attacks on the proving queue
        if (!provingContext.stampStatus.has(hash)) {
          provingContext.queue.push(proveRequest);
          if (provingContext.queue.length == 1) {
            provingContext.stampStatus.set(hash, StampPCDStatus.PROVING);
            prove(proveRequest, provingContext);
          } else {
            provingContext.stampStatus.set(hash, StampPCDStatus.QUEUED);
          }
        }

        const proveRequestStatus = provingContext.stampStatus.get(hash);
        if (proveRequestStatus === undefined) {
          throw new Error();
        }

        const pending: PendingPCD = {
          pcdType: proveRequest.pcdType,
          hash: hash,
          status: proveRequestStatus,
        };
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
        const response = await verify(verifyRequest);
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
        const status = provingContext.stampStatus.get(hash);
        if (status === StampPCDStatus.COMPLETE) {
          res.status(200).json({
            status: StampPCDStatus.COMPLETE,
            proof: provingContext.stampResult.get(hash)?.serializedPCD,
          });
        } else if (status === StampPCDStatus.ERROR) {
          res.status(500).json({
            status: StampPCDStatus.ERROR,
          });
        } else {
          res.status(400).send({
            status,
          });
        }
      } catch (e) {
        next(e);
      }
    }
  );
}
