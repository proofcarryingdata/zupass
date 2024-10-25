import {
  PendingPCD,
  ProofStatusResponseValue,
  ServerProofRequest,
  SupportedPCDsResponseValue
} from "@pcd/passport-interface";
import express, { Request, Response } from "express";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkExistsForRoute } from "../../util/util";
import { checkQueryParam } from "../params";

export function initProvingRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { provingService }: GlobalServices
): void {
  logger("[INIT] initializing proving routes");

  /**
   * Enqueues a {@link ServerProofRequest} to be proved by the server.
   *
   * @todo - turn off for zuconnect / devconnect
   */
  app.post("/pcds/prove", async (req: Request, res: Response) => {
    checkExistsForRoute(provingService);
    const result = await provingService.enqueueProofRequest(
      req.body as ServerProofRequest
    );
    res.json(result satisfies PendingPCD);
  });

  /**
   * Gets the list of supported PCD types that this backend can prove
   * on behalf of users.
   *
   * @todo - turn off for zuconnect / devconnect
   */
  app.get("/pcds/supported", async (_req: Request, res: Response) => {
    checkExistsForRoute(provingService);
    res.json(
      provingService.getSupportedPCDTypes() satisfies SupportedPCDsResponseValue
    );
  });

  /**
   * Gets the status of a pending proof. Proofs are executed one a time.
   *
   * @todo - turn off for zuconnect / devconnect
   */
  app.get("/pcds/status", async (req: Request, res: Response) => {
    checkExistsForRoute(provingService);
    const result = provingService.getPendingPCDStatus(
      checkQueryParam(req, "hash")
    );
    res.json(result satisfies ProofStatusResponseValue);
  });
}
