import {
  ActionConfigResponseValue,
  Feed,
  GenericIssuanceHistoricalSemaphoreGroupResponseValue,
  GenericIssuancePipelineSemaphoreGroupsResponseValue,
  GenericIssuanceSemaphoreGroupResponseValue,
  GenericIssuanceSemaphoreGroupRootResponseValue,
  GenericIssuanceValidSemaphoreGroupResponseValue,
  ListFeedsResponseValue,
  PipelineInfoConsumer,
  PipelineInfoResponseValue,
  PodboxTicketActionPreCheckRequest,
  PodboxTicketActionRequest,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDPermissionType, getPcdsFromActions } from "@pcd/pcd-collection";
import { str } from "@pcd/util";
import _ from "lodash";
import { PoolClient } from "postgres-pool";
import { IPipelineConsumerDB } from "../../../database/queries/pipelineConsumerDB";
import { sqlQueryWithPool } from "../../../database/sqlQuery";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { ApplicationContext } from "../../../types";
import { logger } from "../../../util/logger";
import { LocalFileService } from "../../LocalFileService";
import { traceFlattenedObject, traced } from "../../telemetryService";
import { isCheckinCapability } from "../capabilities/CheckinCapability";
import {
  FeedIssuanceCapability,
  ensureFeedIssuanceCapability,
  isFeedIssuanceCapability
} from "../capabilities/FeedIssuanceCapability";
import {
  ensureSemaphoreGroupCapability,
  isSemaphoreGroupCapability
} from "../capabilities/SemaphoreGroupCapability";
import { tracePipeline, traceUser } from "../honeycombQueries";
import { PipelineUser } from "../pipelines/types";
import { CredentialSubservice } from "./CredentialSubservice";
import { PipelineSubservice } from "./PipelineSubservice";

const SERVICE_NAME = "PIPELINE_API_SUBSERVICE";
const LOG_TAG = `[${SERVICE_NAME}]`;

/**
 * Encapsulates the publicly-accessible (via the internet) APIs that
 * each {@link Pipeline} exposes. This includes things like feed-based
 * {@link PCD} issuance.
 */
export class PipelineAPISubservice {
  private context: ApplicationContext;
  private pipelineSubservice: PipelineSubservice;
  private consumerDB: IPipelineConsumerDB;
  private credentialSubservice: CredentialSubservice;
  private localFileService: LocalFileService | null;

  public constructor(
    context: ApplicationContext,
    consumerDB: IPipelineConsumerDB,
    pipelineSubservice: PipelineSubservice,
    credentailSubservice: CredentialSubservice,
    localFileService: LocalFileService | null
  ) {
    this.context = context;
    this.pipelineSubservice = pipelineSubservice;
    this.consumerDB = consumerDB;
    this.credentialSubservice = credentailSubservice;
    this.localFileService = localFileService;
  }

  /**
   * Handles incoming requests that hit a Pipeline-specific feed for PCDs
   * for every single pipeline that has this capability that this server manages.
   */
  public async handlePollFeed(
    pipelineId: string,
    req: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    return traced(SERVICE_NAME, "handlePollFeed", async (span) => {
      logger(LOG_TAG, `handlePollFeed`, pipelineId, str(req));
      span?.setAttribute("feed_id", req.feedId);
      const pipelineSlot =
        await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
      tracePipeline(pipelineSlot.definition);
      const pipeline =
        await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
      const feed = ensureFeedIssuanceCapability(pipeline, req.feedId);
      const feedResponse = await feed.issue(req);
      traceFlattenedObject(span, {
        result: {
          actionCount: feedResponse.actions.length,
          pcdCount: getPcdsFromActions(feedResponse.actions).length
        }
      });
      return feedResponse;
    });
  }

  /**
   * Gets the runtime-maintained metadata about a given {@link Pipeline} on
   * behalf of a particular {@link PipelineUser}, if they have the appropriate
   * permissions.
   *
   * @throws if the given user does not have permission, or if the pipeline
   *   does not exist.
   */
  public async handleGetPipelineInfo(
    client: PoolClient,
    user: PipelineUser,
    pipelineId: string
  ): Promise<PipelineInfoResponseValue> {
    return traced(SERVICE_NAME, "handleGetPipelineInfo", async (span) => {
      logger(LOG_TAG, "handleGetPipelineInfo", str(user), pipelineId);
      traceUser(user);
      const pipelineSlot =
        await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
      tracePipeline(pipelineSlot.definition);
      const pipelineInstance =
        await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
      this.pipelineSubservice.ensureUserHasPipelineDefinitionAccess(
        user,
        pipelineSlot.definition
      );

      const pipelineFeeds: FeedIssuanceCapability[] =
        pipelineInstance.capabilities.filter(isFeedIssuanceCapability);

      const lastLoad = await this.pipelineSubservice.getLastLoadSummary(
        pipelineInstance.id
      );
      const latestAtoms = await this.pipelineSubservice.getPipelineAtoms(
        pipelineInstance.id
      );

      // If the pipeline has semaphore groups, we want to populate consumer
      // data. If there are no semaphore groups, we don't.
      // Rather than inspect the configuration, which depends on knowing all
      // of the possible pipeline types and the structure of their
      // configurations, we can ask the SemaphoreGroupCapability if it has any
      // groups (if one exists). Only if the SemaphoreGroupCapability exists
      // and has supported groups will we include consumer data.
      let pipelineHasSemaphoreGroups = false;
      const semaphoreGroupCapability = pipelineInstance.capabilities.find(
        isSemaphoreGroupCapability
      );
      if (
        semaphoreGroupCapability &&
        semaphoreGroupCapability.getSupportedGroups().length > 0
      ) {
        pipelineHasSemaphoreGroups = true;
      }

      const latestConsumers = await sqlQueryWithPool(
        this.context.dbPool,
        (client) => this.consumerDB.loadAll(client, pipelineInstance.id)
      );

      if (!pipelineSlot.owner) {
        throw new Error("owner does not exist");
      }

      const info = {
        ownerEmail: pipelineSlot.owner.email,
        hasCachedLoad:
          (await this.localFileService?.hasCachedLoad(pipelineId)) ?? false,
        cachedBytes:
          (await this.localFileService?.getCachedLoadSize(pipelineId)) ?? 0,
        loading: pipelineSlot.loading,
        latestAtoms,
        lastLoad,

        feeds: pipelineFeeds.map((f) => ({
          name: f.options.feedDisplayName,
          url: f.feedUrl
        })),

        zuAuthConfig: await pipelineFeeds[0]?.getZuAuthConfig(),

        latestConsumers: !pipelineHasSemaphoreGroups
          ? undefined
          : latestConsumers
              .map(
                (consumer) =>
                  ({
                    email: consumer.email,
                    commitment: consumer.commitment,
                    timeCreated: consumer.timeCreated.toISOString(),
                    timeUpdated: consumer.timeUpdated.toISOString()
                  }) satisfies PipelineInfoConsumer
              )
              .sort((a, b) => b.timeUpdated.localeCompare(a.timeUpdated)),

        editHistory: await this.pipelineSubservice.getPipelineEditHistory(
          client,
          pipelineId,
          100
        )
      } satisfies PipelineInfoResponseValue;

      if (lastLoad) {
        const redactedCopyOfLoadSummary = _.cloneDeep(lastLoad);
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        delete (redactedCopyOfLoadSummary as any).latestLogs;
        traceFlattenedObject(span, { loadSummary: redactedCopyOfLoadSummary });
      }

      traceFlattenedObject(span, { pipelineFeeds });

      return info;
    });
  }

  /**
   * Accessible to public internet; returns the feeds exposed by this {@link Pipeline},
   * which Zupass can use to get {@link PCD}s from the pipeline.
   */
  public async handleListFeed(
    pipelineId: string,
    feedId: string
  ): Promise<ListFeedsResponseValue> {
    return traced(SERVICE_NAME, "handleListFeed", async (span) => {
      span?.setAttribute("feed_id", feedId);
      const pipelineSlot =
        await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
      const pipeline =
        await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
      tracePipeline(pipelineSlot.definition);

      const feedCapability = ensureFeedIssuanceCapability(pipeline, feedId);

      const result = {
        feeds: [
          {
            id: feedId,
            name: feedCapability.options.feedDisplayName,
            description: feedCapability.options.feedDescription,
            permissions: [
              {
                folder: feedCapability.options.feedFolder,
                type: PCDPermissionType.DeleteFolder
              },
              {
                folder: feedCapability.options.feedFolder,
                type: PCDPermissionType.AppendToFolder
              },
              {
                folder: feedCapability.options.feedFolder,
                type: PCDPermissionType.ReplaceInFolder
              }
            ],
            credentialRequest: {
              signatureType: "sempahore-signature-pcd",
              pcdType: "email-pcd"
            }
          } satisfies Feed
        ],
        providerName: "Podbox",
        providerUrl: feedCapability.feedUrl
      } satisfies ListFeedsResponseValue;

      traceFlattenedObject(span, {
        feedCount: result.feeds.length
      });

      return result;
    });
  }

  /**
   * Handles incoming requests that hit a Pipeline which implements the checkin
   * capability for every pipeline this server manages. Ensures the given Zupass
   * user is permissioned to perform the checkin/other ticket action given the
   * {@link PipelineDefinition}'s superuser configuration.
   */
  public async handleCheckIn(
    req: PodboxTicketActionRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return traced(SERVICE_NAME, "handleCheckIn", async (span) => {
      logger(LOG_TAG, "handleCheckIn", str(req));

      try {
        await this.credentialSubservice.verifyAndExpectZupassEmail(
          req.credential
        );
      } catch (_e) {
        return {
          success: false,
          error: { name: "InvalidSignature" }
        };
      }

      const eventId = req.eventId;

      span?.setAttribute("event_id", eventId);

      for (const pipeline of this.pipelineSubservice.getAllPipelines()) {
        if (!pipeline.instance) {
          continue;
        }

        for (const capability of pipeline?.instance?.capabilities ?? []) {
          if (
            isCheckinCapability(capability) &&
            capability.canHandleCheckinForEvent(eventId)
          ) {
            tracePipeline(pipeline.definition);
            const res = await capability.checkin(req);
            traceFlattenedObject(span, { res });
            return res;
          }
        }
      }

      throw new PCDHTTPError(
        403,
        `can't find pipeline to check-in for event ${eventId}`
      );
    });
  }

  /**
   * Checks that a ticket could be checked in (or be the target of some other
   * action, like 'getting contact' or 'award star') by the caller as identified
   * by their credential.
   */
  public async handlePreCheck(
    req: PodboxTicketActionPreCheckRequest
  ): Promise<ActionConfigResponseValue> {
    return traced(SERVICE_NAME, "handlePreCheck", async (span) => {
      logger(SERVICE_NAME, "handlePreCheck", str(req));

      try {
        await this.credentialSubservice.verifyAndExpectZupassEmail(
          req.credential
        );
      } catch (e) {
        return {
          success: false,
          error: { name: "InvalidSignature" }
        };
      }

      const eventId = req.eventId;
      span?.setAttribute("event_id", eventId);

      for (const pipeline of this.pipelineSubservice.getAllPipelines()) {
        if (!pipeline.instance) {
          continue;
        }

        for (const capability of pipeline.instance.capabilities) {
          if (
            isCheckinCapability(capability) &&
            capability.canHandleCheckinForEvent(eventId)
          ) {
            tracePipeline(pipeline.definition);
            const res = await capability.preCheck(req);
            traceFlattenedObject(span, { res });
            return res;
          }
        }
      }

      throw new PCDHTTPError(
        403,
        `can't find pipeline to check-in for event ${eventId}`
      );
    });
  }

  /**
   * Accessible to the public internet. Gets the members of the given Semaphore
   * group, the members of which are identified by their Semaphore id.
   */
  public async handleGetSemaphoreGroup(
    pipelineId: string,
    groupId: string
  ): Promise<GenericIssuanceSemaphoreGroupResponseValue> {
    return traced(SERVICE_NAME, "handleGetSemaphoreGroup", async (span) => {
      span?.setAttribute("pipeline_id", pipelineId);
      span?.setAttribute("group_id", groupId);
      const pipelineSlot =
        await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
      const pipeline =
        await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
      tracePipeline(pipelineSlot.definition);

      const semaphoreGroupCapability = ensureSemaphoreGroupCapability(pipeline);

      // Retrieving this via the capability might be unnecessary, since we have
      // access to the PipelineSemaphoreGroupDB already, and could just look the
      // data up from there.
      const serializedGroup =
        await semaphoreGroupCapability.getSerializedLatestGroup(groupId);
      if (!serializedGroup) {
        throw new PCDHTTPError(
          403,
          `can't find semaphore group ${groupId} for pipeline ${pipelineId}`
        );
      }

      return serializedGroup;
    });
  }

  /**
   * Gets the latest root hash of the merkle tree of the latest Semaphore group
   * with the given id.
   */
  public async handleGetLatestSemaphoreGroupRoot(
    pipelineId: string,
    groupId: string
  ): Promise<GenericIssuanceSemaphoreGroupRootResponseValue> {
    return traced(
      SERVICE_NAME,
      "handleGetLatestSemaphoreGroupRoot",
      async (span) => {
        span?.setAttribute("pipeline_id", pipelineId);
        span?.setAttribute("group_id", groupId);
        const pipelineSlot =
          await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
        const pipeline =
          await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
        tracePipeline(pipelineSlot.definition);

        const semaphoreGroupCapability =
          ensureSemaphoreGroupCapability(pipeline);

        // Retrieving this via the capability might be unnecessary, since we have
        // access to the PipelineSemaphoreGroupDB already, and could just look the
        // data up from there.
        const rootHash =
          await semaphoreGroupCapability.getLatestGroupRoot(groupId);
        if (rootHash === undefined) {
          throw new PCDHTTPError(
            403,
            `can't find semaphore group ${groupId} for pipeline ${pipelineId}`
          );
        }

        return rootHash;
      }
    );
  }

  /**
   * Gets the semaphore group identified by the given pipeline id, group id, and group root hash.
   */
  public async handleGetHistoricalSemaphoreGroup(
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<GenericIssuanceHistoricalSemaphoreGroupResponseValue> {
    return traced(
      SERVICE_NAME,
      "handleGetHistoricalSemaphoreGroup",
      async (span) => {
        span?.setAttribute("pipeline_id", pipelineId);
        span?.setAttribute("group_id", groupId);
        span?.setAttribute("root_hash", rootHash);
        const pipelineSlot =
          await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
        const pipeline =
          await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
        tracePipeline(pipelineSlot.definition);

        const semaphoreGroupCapability =
          ensureSemaphoreGroupCapability(pipeline);
        const serializedGroup =
          await semaphoreGroupCapability.getSerializedHistoricalGroup(
            groupId,
            rootHash
          );
        if (!serializedGroup) {
          throw new PCDHTTPError(
            403,
            `can't find semaphore group ${groupId} for pipeline ${pipelineId}`
          );
        }

        return serializedGroup;
      }
    );
  }

  /**
   * Returns whether the given @param rootHash is a valid root hash of the given
   * Sempahore group at some point in time.
   */
  public async handleGetValidSemaphoreGroup(
    pipelineId: string,
    groupId: string,
    rootHash: string
  ): Promise<GenericIssuanceValidSemaphoreGroupResponseValue> {
    return traced(
      SERVICE_NAME,
      "handleGetValidSemaphoreGroup",
      async (span) => {
        span?.setAttribute("pipeline_id", pipelineId);
        span?.setAttribute("group_id", groupId);
        span?.setAttribute("root_hash", rootHash);
        const pipelineSlot =
          await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
        const pipeline =
          await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
        tracePipeline(pipelineSlot.definition);
        const semaphoreGroupCapability =
          ensureSemaphoreGroupCapability(pipeline);
        const serializedGroup =
          await semaphoreGroupCapability.getSerializedHistoricalGroup(
            groupId,
            rootHash
          );

        return {
          valid: serializedGroup !== undefined
        };
      }
    );
  }

  /**
   * Gets a {@link PipelineSemaphoreGroupInfo} for each group served by the given
   * {@link Pipeline}.
   */
  public async handleGetPipelineSemaphoreGroups(
    pipelineId: string
  ): Promise<GenericIssuancePipelineSemaphoreGroupsResponseValue> {
    return traced(
      SERVICE_NAME,
      "handleGetPipelineSemaphoreGroups",
      async (span) => {
        span?.setAttribute("pipeline_id", pipelineId);
        const pipelineSlot =
          await this.pipelineSubservice.ensurePipelineSlotExists(pipelineId);
        const pipeline =
          await this.pipelineSubservice.ensurePipelineStarted(pipelineId);
        tracePipeline(pipelineSlot.definition);
        const semaphoreGroupCapability =
          ensureSemaphoreGroupCapability(pipeline);

        return semaphoreGroupCapability.getSupportedGroups();
      }
    );
  }
}
