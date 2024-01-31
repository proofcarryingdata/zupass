import {
  GenericIssuanceCheckInRequest,
  GenericIssuanceCheckInResponseValue,
  GenericIssuanceSendEmailResponseValue,
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

  app.get(
    "/generic-issuance/api/pipelines",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const { id } =
        await genericIssuanceService.authenticateStytchSession(req);
      res.send(await genericIssuanceService.getAllUserPipelineDefinitions(id));
    }
  );

  app.get(
    "/generic-issuance/api/pipelines/:id",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const { id: userId } =
        await genericIssuanceService.authenticateStytchSession(req);
      res.send(
        await genericIssuanceService.getPipelineDefinition(
          userId,
          checkUrlParam(req, "id")
        )
      );
    }
  );

  app.put(
    "/generic-issuance/api/pipelines",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const { id: userId } =
        await genericIssuanceService.authenticateStytchSession(req);
      res.send(
        await genericIssuanceService.upsertPipelineDefinition(userId, req.body)
      );
    }
  );

  app.delete(
    "/generic-issuance/api/pipelines/:id",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const { id: userId } =
        await genericIssuanceService.authenticateStytchSession(req);
      res.send(
        await genericIssuanceService.deletePipelineDefinition(
          userId,
          checkUrlParam(req, "id")
        )
      );
    }
  );
}
