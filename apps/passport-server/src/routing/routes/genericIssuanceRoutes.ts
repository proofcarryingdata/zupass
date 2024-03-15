import {
  ActionConfigResponseValue,
  GenericIssuancePreCheckRequest,
  ListFeedsResponseValue,
  PipelineInfoRequest,
  PipelineInfoResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  ZuboxCheckInRequest,
  ZuboxDeletePipelineResponseValue,
  ZuboxFetchPretixEventsRequest,
  ZuboxFetchPretixEventsResponseValue,
  ZuboxFetchPretixProductsRequest,
  ZuboxFetchPretixProductsResponseValue,
  ZuboxGetAllUserPipelinesResponseValue,
  ZuboxGetPipelineResponseValue,
  ZuboxSelfResponseValue,
  ZuboxSendEmailResponseValue,
  ZuboxTicketActionResponseValue,
  ZuboxUpsertPipelineRequest,
  ZuboxUpsertPipelineResponseValue
} from "@pcd/passport-interface";
import { SerializedSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import express from "express";
import urljoin from "url-join";
import { GenericIssuanceService } from "../../services/generic-issuance/genericIssuanceService";
import {
  getAllGenericIssuanceHTTPQuery,
  getAllGenericIssuanceQuery,
  getPipelineAllHQuery,
  getPipelineLoadHQuery as getPipelineDataLoadHQuery,
  traceUser
} from "../../services/generic-issuance/honeycombQueries";
import { createQueryUrl } from "../../services/telemetryService";
import { GlobalServices } from "../../types";
import { IS_PROD } from "../../util/isProd";
import { logger } from "../../util/logger";
import { checkBody, checkUrlParam } from "../params";
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
   * Gets the currently logged in user based on their JWT.
   *
   * P.S. GraphQL would be so nice.
   */
  app.post("/generic-issuance/api/self", async (req, res) => {
    checkGenericIssuanceServiceStarted(genericIssuanceService);
    const user = await genericIssuanceService.authenticateStytchSession(req);
    traceUser(user);

    const result: ZuboxSelfResponseValue = {
      email: user.email,
      isAdmin: user.isAdmin,
      id: user.id
    };

    res.json(result satisfies ZuboxSelfResponseValue);
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
   * Gets more granular pipeline info ({@link PipelineInfoResponseValue}) that
   * is visible to the logged in user
   */
  app.post("/generic-issuance/api/pipeline-info", async (req, res) => {
    checkGenericIssuanceServiceStarted(genericIssuanceService);
    const user = await genericIssuanceService.authenticateStytchSession(req);
    traceUser(user);

    const reqBody = req.body as PipelineInfoRequest;
    const result = await genericIssuanceService.handleGetPipelineInfo(
      user,
      reqBody.pipelineId
    );
    res.json(result satisfies PipelineInfoResponseValue);
  });

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
    "/generic-issuance/api/check-in",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const request = req.body as ZuboxCheckInRequest;
      const result = await genericIssuanceService.handleCheckIn(request);
      res.json(result satisfies ZuboxTicketActionResponseValue);
    }
  );

  /**
   * Authenticated by PCD so doesn't need auth.
   */
  app.post(
    "/generic-issuance/api/pre-check",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const request = req.body as GenericIssuancePreCheckRequest;
      const result = await genericIssuanceService.handlePreCheck(request);
      res.json(result satisfies ActionConfigResponseValue);
    }
  );

  app.post(
    "/generic-issuance/api/user/send-email/:email",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const email = checkUrlParam(req, "email");
      if (process.env.STYTCH_BYPASS === "true") {
        if (IS_PROD) {
          throw new Error("can't bypass email in prod");
        }

        res
          .status(302)
          .send(
            urljoin(
              process.env.GENERIC_ISSUANCE_CLIENT_URL ?? "",
              "?token=" + encodeURIComponent(email)
            )
          );
      } else {
        const result = await genericIssuanceService.sendLoginEmail(email);
        res.json(result satisfies ZuboxSendEmailResponseValue);
      }
    }
  );

  /**
   * Gets pipelines visible to logged in user.
   */
  app.post(
    "/generic-issuance/api/get-all-user-pipelines",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const user = await genericIssuanceService.authenticateStytchSession(req);
      traceUser(user);

      const result =
        await genericIssuanceService.getAllUserPipelineDefinitions(user);
      res.json(result satisfies ZuboxGetAllUserPipelinesResponseValue);
    }
  );

  /**
   * Gets specific pipeline that is visible to logged in user.
   */
  app.post(
    "/generic-issuance/api/get-pipeline/:id",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const user = await genericIssuanceService.authenticateStytchSession(req);
      traceUser(user);

      const result = await genericIssuanceService.loadPipelineDefinition(
        user,
        checkUrlParam(req, "id")
      );
      res.json(result satisfies ZuboxGetPipelineResponseValue);
    }
  );

  /**
   * Upserts a specific pipeline that is visible to logged in user.
   */
  app.post(
    "/generic-issuance/api/upsert-pipeline",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const user = await genericIssuanceService.authenticateStytchSession(req);
      traceUser(user);

      const reqBody = req.body as ZuboxUpsertPipelineRequest;
      const { definition: result } =
        await genericIssuanceService.upsertPipelineDefinition(
          user,
          reqBody.pipeline
        );
      res.json(result satisfies ZuboxUpsertPipelineResponseValue);
    }
  );

  /**
   * Deletes a specific pipeline that is visible to logged in user.
   */
  app.post(
    "/generic-issuance/api/delete-pipeline/:id",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const user = await genericIssuanceService.authenticateStytchSession(req);
      traceUser(user);

      const result = await genericIssuanceService.deletePipelineDefinition(
        user,
        checkUrlParam(req, "id")
      );
      res.json(result satisfies ZuboxDeletePipelineResponseValue);
    }
  );

  /**
   * Doesn't need auth as the location that we're redirecting to has its own auth layer.
   */
  app.get(
    "/generic-issuance/api/pipeline-honeycomb/load/:id",
    async (req, res) => {
      const pipelineId = checkUrlParam(req, "id");
      const query = getPipelineDataLoadHQuery(pipelineId);
      const queryUrl = await createQueryUrl(query);
      res.redirect(queryUrl);
    }
  );

  /**
   * Doesn't need auth as the location that we're redirecting to has its own auth layer.
   */
  app.get(
    "/generic-issuance/api/pipeline-honeycomb/all/:id",
    async (req, res) => {
      const pipelineId = checkUrlParam(req, "id");
      const query = getPipelineAllHQuery(pipelineId);
      const queryUrl = await createQueryUrl(query);
      res.redirect(queryUrl);
    }
  );

  /**
   * Doesn't need auth as the location that we're redirecting to has its own auth layer.
   */
  app.get(
    "/generic-issuance/api/pipeline-honeycomb/all-http",
    async (req, res) => {
      const query = getAllGenericIssuanceHTTPQuery();
      const queryUrl = await createQueryUrl(query);
      res.redirect(queryUrl);
    }
  );

  /**
   * Doesn't need auth as the location that we're redirecting to has its own auth layer.
   */
  app.get("/generic-issuance/api/pipeline-honeycomb/all/", async (req, res) => {
    const query = getAllGenericIssuanceQuery();
    const queryUrl = await createQueryUrl(query);
    res.redirect(queryUrl);
  });

  app.post(
    "/generic-issuance/api/fetch-pretix-events",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const user = await genericIssuanceService.authenticateStytchSession(req);
      traceUser(user);

      const events = await genericIssuanceService.fetchAllPretixEvents(
        checkBody<ZuboxFetchPretixEventsRequest, "orgUrl">(req, "orgUrl"),
        checkBody<ZuboxFetchPretixEventsRequest, "token">(req, "token")
      );
      res.json(events satisfies ZuboxFetchPretixEventsResponseValue);
    }
  );

  app.post(
    "/generic-issuance/api/fetch-pretix-products",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const user = await genericIssuanceService.authenticateStytchSession(req);
      traceUser(user);

      const events = await genericIssuanceService.fetchPretixProducts(
        checkBody<ZuboxFetchPretixProductsRequest, "orgUrl">(req, "orgUrl"),
        checkBody<ZuboxFetchPretixProductsRequest, "token">(req, "token"),
        checkBody<ZuboxFetchPretixProductsRequest, "eventID">(req, "eventID")
      );
      res.json(events satisfies ZuboxFetchPretixProductsResponseValue);
    }
  );

  app.post("/edgecity/balances", async (req, res) => {
    checkGenericIssuanceServiceStarted(genericIssuanceService);
    res.send(await genericIssuanceService.getBalances());
  });

  /**
   * Gets the latest Semaphore group for a given semaphore group id.
   */
  app.get(
    "/generic-issuance/api/semaphore/:pipelineId/:groupId",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineId = checkUrlParam(req, "pipelineId");
      const groupId = checkUrlParam(req, "groupId");

      const result = await genericIssuanceService.handleGetSemaphoreGroup(
        pipelineId,
        groupId
      );

      res.json(result satisfies SerializedSemaphoreGroup);
    }
  );

  /**
   * Gets the root for the latest Semaphore group for a given group id.
   */
  app.get(
    "/generic-issuance/api/semaphore/:pipelineId/:groupId/latest-root",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineId = checkUrlParam(req, "pipelineId");
      const groupId = checkUrlParam(req, "groupId");

      const result =
        await genericIssuanceService.handleGetLatestSemaphoreGroupRoot(
          pipelineId,
          groupId
        );

      res.json(result);
    }
  );

  /**
   * Gets historical Semaphore group for a given Semaphore group id and root.
   */
  app.get(
    "/generic-issuance/api/semaphore/:pipelineId/:groupId/:root",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineId = checkUrlParam(req, "pipelineId");
      const groupId = checkUrlParam(req, "groupId");
      const root = checkUrlParam(req, "root");

      const result =
        await genericIssuanceService.handleGetHistoricalSemaphoreGroup(
          pipelineId,
          groupId,
          root
        );

      res.json(result satisfies SerializedSemaphoreGroup);
    }
  );

  /**
   * Checks the validity of a given Semaphore group id and root.
   */
  app.get(
    "/generic-issuance/api/semaphore/:pipelineId/:groupId/valid/:root",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineId = checkUrlParam(req, "pipelineId");
      const groupId = checkUrlParam(req, "groupId");
      const root = checkUrlParam(req, "root");

      const result = await genericIssuanceService.handleGetValidSemaphoreGroup(
        pipelineId,
        groupId,
        root
      );

      res.json(result);
    }
  );

  /**
   * Gets the list of supported Semaphore groups for a pipeline.
   */
  app.get(
    "/generic-issuance/api/semaphore-groups/:pipelineId",
    async (req: express.Request, res: express.Response) => {
      checkGenericIssuanceServiceStarted(genericIssuanceService);
      const pipelineId = checkUrlParam(req, "pipelineId");

      const result =
        await genericIssuanceService.handleGetPipelineSemaphoreGroups(
          pipelineId
        );

      res.json(result);
    }
  );
}
