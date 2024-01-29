/* eslint-disable @typescript-eslint/no-unused-vars */
import {
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import express from "express";
import { GenericIssuanceService } from "../../services/generic-issuance/genericIssuanceService";
import { GlobalServices } from "../../types";
import { logger } from "../../util/logger";
import { checkUrlParam } from "../params";
import { PCDHTTPError } from "../pcdHttpError";

export function initGenericIssuanceRoutes(
  app: express.Application,
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

  app.get("/generic-issuance/status", async (req, res) => {
    if (genericIssuanceService) {
      res.send("started");
    } else {
      res.send("not started");
    }
  });

  app.post(
    "/generic-issuance/api/poll-feed/:pipelineID",
    async (req: express.Request, res: express.Response) => {
      checkIssuanceServiceStarted(genericIssuanceService);
      const pipelineID = checkUrlParam(req, "pipelineID");
      const request = req.body as PollFeedRequest;
      const result = await genericIssuanceService.handlePollFeed(
        pipelineID,
        request
      );
      res.send(result satisfies PollFeedResponseValue);
    }
  );

  app.post(
    "/generic-issuance/api/check-in/pipelineID",
    async (req: express.Request, res: express.Response) => {
      checkIssuanceServiceStarted(genericIssuanceService);
      const pipelineID = checkUrlParam(req, "pipelineID");
      const request = req.body as CheckTicketInRequest;
      const result = await genericIssuanceService.handleCheckIn(
        pipelineID,
        request
      );
      res.send(result satisfies CheckTicketInResponseValue);
    }
  );
}
