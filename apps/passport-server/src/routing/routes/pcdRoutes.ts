import {
  hashRequest,
  PendingStamp,
  ProveRequest,
  StampStatus,
  VerifyRequest,
} from "@pcd/passport-interface";
import express, { NextFunction, Request, Response } from "express";
import {
  getSupportedPCDTypes,
  initPackages,
  prove,
  verify,
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
      try {
        const proveRequest: ProveRequest = req.body;
        const hash = hashRequest(proveRequest);
        _context.queue.push(proveRequest);
        if (_context.queue.length == 1) {
          _context.stampStatus.set(hash, StampStatus.PROVING);
          prove(proveRequest, _context);
        } else {
          _context.stampStatus.set(hash, StampStatus.IN_QUEUE);
        }

        const pending: PendingStamp = {
          pcdType: proveRequest.pcdType,
          hash: hash,
          status: _context.stampStatus.get(hash)!,
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
        const status = _context.stampStatus.get(hash);
        if (status === StampStatus.COMPLETE) {
          res.status(200).json(_context.stampResult.get(hash));
        } else {
          res.status(400).send(status);
        }
      } catch (e) {
        next(e);
      }
    }
  );
}
