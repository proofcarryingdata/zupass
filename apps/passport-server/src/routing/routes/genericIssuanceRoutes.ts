/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import express, { Router } from "express";
import { FeedIssuanceCapability } from "../../services/generic-issuance/capabilities/FeedIssuanceCapability";
import { GenericIssuanceService } from "../../services/generic-issuance/genericIssuanceService";
import { Pipeline } from "../../services/generic-issuance/pipelines/types";
import { ApplicationContext, GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { PCDHTTPError } from "../pcdHttpError";

/**
 * TODO:
 * - actually interpret HTTP requests, and respond appropriately.
 * - probably move to a different file than this
 */
export async function setupFeedCapabilityRoutes(
  router: Router,
  pipeline: Pipeline,
  capability: FeedIssuanceCapability
): Promise<void> {
  const urlPath = `/generic-issuance/${pipeline.id}/${capability.subId}/poll-feed`;
  capability.urlPath = urlPath;
  router.post(urlPath, (req, res) => {
    res.send("ok"); // TODO
  });
}

export function initGenericIssuanceRoutes(
  app: express.Application,
  _context: ApplicationContext,
  { genericIssuanceService }: GlobalServices
): void {
  logger("[INIT] initializing generic issuance routes");

  /**
   * Throws if we don't have an instance of {@link issuanceService}.
   */
  function checkIssuanceServiceStarted(
    issuanceService: GenericIssuanceService | null
  ): asserts issuanceService {
    if (!issuanceService) {
      throw new PCDHTTPError(503, "issuance service not instantiated");
    }
  }

  app.post(
    "/generic-issuance/api/poll-feed",
    async (req: express.Request, res: express.Response) => {
      checkIssuanceServiceStarted(genericIssuanceService);

      const request = req.body as PollFeedRequest;
      const result = await genericIssuanceService.handlePollFeed(request);
      res.send(result satisfies PollFeedResponseValue);
    }
  );

  app.post(
    "/generic-issuance/api/check-in",
    async (req: express.Request, res: express.Response) => {
      checkIssuanceServiceStarted(genericIssuanceService);

      const request = req.body as CheckTicketInRequest;
      const result = await genericIssuanceService.handleCheckIn(request);
      res.send(result satisfies CheckTicketInResponseValue);
    }
  );
}
