import {
  GenericIssuanceCheckInRequest,
  GenericIssuanceCheckInResponseValue,
  GenericIssuanceSendEmailResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import cookierParser from "cookie-parser";
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
  app.use(cookierParser());

  /**
   * Throws if we don't have an instance of {@link GenericIssuanceService}.
   */
  function checkGenericIssuanceServiceStarted(
    issuanceService: GenericIssuanceService | null
  ): asserts issuanceService {
    if (!issuanceService) {
      throw new PCDHTTPError(503, "generic issuance service not instantiated");
    }
  }

  app.get("/generic-issuance/status", async (req, res) => {
    if (genericIssuanceService) {
      res.send("started");
    } else {
      res.send("not started");
    }
  });

  app.get("/generic-issuance/pipelines", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.sendStatus(403);
      return;
    }

    checkGenericIssuanceServiceStarted(genericIssuanceService);

    res.json(await genericIssuanceService.getAllPipelines());
  });

  app.post(
    "/generic-issuance/api/poll-feed/:pipelineID",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
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
    "/generic-issuance/api/check-in/:pipelineID",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineID = checkUrlParam(req, "pipelineID");
      const request = req.body as GenericIssuanceCheckInRequest;
      const result = await genericIssuanceService.handleCheckIn(
        pipelineID,
        request
      );
      res.send(result satisfies GenericIssuanceCheckInResponseValue);
    }
  );

  app.post(
    "/generic-issuance/api/user/send-email/:email",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const result = await genericIssuanceService.sendLoginEmail(
        checkUrlParam(req, "email")
      );
      res.send(result satisfies GenericIssuanceSendEmailResponseValue);
    }
  );

  // temporary -- just for testing JWT authentication
  app.get(
    "/generic-issuance/api/user/ping",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      await genericIssuanceService.authenticateStytchSession(req);
      res.json("pong");
    }
  );
}
