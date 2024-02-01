import {
  GenericIssuanceCheckInRequest,
  GenericIssuanceCheckInResponseValue,
  GenericIssuanceDeletePipelineResponseValue,
  GenericIssuanceGetAllUserPipelinesResponseValue,
  GenericIssuanceGetPipelineResponseValue,
  GenericIssuanceSendEmailResponseValue,
  GenericIssuanceUpsertPipelineRequest,
  ListFeedsResponseValue,
  PipelineInfoResponseValue,
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

  /**
   * For local development.
   */
  app.get("/generic-issuance/pipelines", async (req, res) => {
    if (process.env.NODE_ENV === "production") {
      res.sendStatus(403);
      return;
    }

    checkGenericIssuanceServiceStarted(genericIssuanceService);

    res.json(await genericIssuanceService.getAllPipelines());
  });

  /**
   * Asks the given feed of a given pipeline for {@link PCD}s
   *
   * Authenticated by PCD so doesn't need auth.
   *
   * Request is {@link PollFeedRequest}
   * Response is {@link PollFeedResponseValue}
   */
  app.post(
    "/generic-issuance/api/feed/:pipelineID/:feedId",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineID = checkUrlParam(req, "pipelineID");
      const feedId = checkUrlParam(req, "feedId");
      const request = req.body as PollFeedRequest;

      if (request.feedId !== feedId) {
        throw new PCDHTTPError(
          400,
          `feed id in url (${feedId}) does not match feed id in request body (${request.feedId})`
        );
      }

      const result = await genericIssuanceService.handlePollFeed(
        pipelineID,
        request
      );

      res.json(result satisfies PollFeedResponseValue);
    }
  );

  /**
   * Needs user authentication.
   */
  app.get(
    "/generic-issuance/api/pipeline-info/:pipelineId",
    async (req, res) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineID = checkUrlParam(req, "pipelineId");
      const result =
        await genericIssuanceService.handleGetPipelineInfo(pipelineID);
      res.json(result satisfies PipelineInfoResponseValue);
    }
  );

  /**
   * Authenticated by PCD so doesn't need auth.
   */
  app.get(
    "/generic-issuance/api/feed/:pipelineID/:feedId",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineID = checkUrlParam(req, "pipelineID");
      const feedId = checkUrlParam(req, "feedId");
      const result = await genericIssuanceService.handleListFeed(
        pipelineID,
        feedId
      );
      res.json(result satisfies ListFeedsResponseValue);
    }
  );

  /**
   * Authenticated by PCD so doesn't need auth.
   */
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
      res.json(result satisfies GenericIssuanceCheckInResponseValue);
    }
  );

  /**
   * TODO: auth?
   */
  app.post(
    "/generic-issuance/api/user/send-email/:email",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const result = await genericIssuanceService.sendLoginEmail(
        checkUrlParam(req, "email")
      );
      res.json(result satisfies GenericIssuanceSendEmailResponseValue);
    }
  );

  app.get(
    "/generic-issuance/api/pipelines",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const { id } =
        await genericIssuanceService.authenticateStytchSession(req);
      res.json(
        (await genericIssuanceService.getAllUserPipelineDefinitions(
          id
        )) satisfies GenericIssuanceGetAllUserPipelinesResponseValue
      );
    }
  );

  app.get(
    "/generic-issuance/api/pipelines/:id",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const { id: userId } =
        await genericIssuanceService.authenticateStytchSession(req);
      res.json(
        (await genericIssuanceService.getPipelineDefinition(
          userId,
          checkUrlParam(req, "id")
        )) satisfies GenericIssuanceGetPipelineResponseValue
      );
    }
  );

  app.put(
    "/generic-issuance/api/pipelines",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const { id: userId } =
        await genericIssuanceService.authenticateStytchSession(req);
      res.json(
        (await genericIssuanceService.upsertPipelineDefinition(
          userId,
          req.body as GenericIssuanceUpsertPipelineRequest
        )) satisfies GenericIssuanceUpsertPipelineRequest
      );
    }
  );

  app.delete(
    "/generic-issuance/api/pipelines/:id",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const { id: userId } =
        await genericIssuanceService.authenticateStytchSession(req);
      res.json(
        (await genericIssuanceService.deletePipelineDefinition(
          userId,
          checkUrlParam(req, "id")
        )) satisfies GenericIssuanceDeletePipelineResponseValue
      );
    }
  );
}
