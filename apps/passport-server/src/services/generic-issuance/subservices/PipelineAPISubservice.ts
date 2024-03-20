import {
  ActionConfigResponseValue,
  Feed,
  GenericIssuanceCheckInRequest,
  GenericIssuanceHistoricalSemaphoreGroupResponseValue,
  GenericIssuancePipelineSemaphoreGroupsResponseValue,
  GenericIssuancePreCheckRequest,
  GenericIssuanceSemaphoreGroupResponseValue,
  GenericIssuanceSemaphoreGroupRootResponseValue,
  GenericIssuanceValidSemaphoreGroupResponseValue,
  ListFeedsResponseValue,
  PipelineInfoResponseValue,
  PodboxTicketActionResponseValue,
  PollFeedRequest,
  PollFeedResponseValue,
  TicketActionPayload
} from "@pcd/passport-interface";
import { PCDPermissionType, getPcdsFromActions } from "@pcd/pcd-collection";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { str } from "@pcd/util";
import { IPipelineConsumerDB } from "../../../database/queries/pipelineConsumerDB";
import { PCDHTTPError } from "../../../routing/pcdHttpError";
import { logger } from "../../../util/logger";
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
import { PipelineSubservice } from "./PipelineSubservice";

const SERVICE_NAME = "PIPELINE_API_SUBSERVICE";
const LOG_TAG = `[${SERVICE_NAME}]`;

export class PipelineAPISubservice {
  private pipelineSubservice: PipelineSubservice;
  private consumerDB: IPipelineConsumerDB;

  public constructor(
    consumerDB: IPipelineConsumerDB,
    pipelineSubservice: PipelineSubservice
  ) {
    this.pipelineSubservice = pipelineSubservice;
    this.consumerDB = consumerDB;
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

  public async handleGetPipelineInfo(
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

      const summary = await this.pipelineSubservice.getLastLoadSummary(
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

      // Only actually run the query if there are Semaphore groups
      const latestConsumers = pipelineHasSemaphoreGroups
        ? await this.consumerDB.loadAll(pipelineInstance.id)
        : [];

      if (!pipelineSlot.owner) {
        throw new Error("owner does not exist");
      }

      const info = {
        feeds: pipelineFeeds.map((f) => ({
          name: f.options.feedDisplayName,
          url: f.feedUrl
        })),
        latestAtoms: latestAtoms,
        latestConsumers: !pipelineHasSemaphoreGroups
          ? undefined
          : latestConsumers
              .map((consumer) => ({
                email: consumer.email,
                commitment: consumer.commitment,
                timeCreated: consumer.timeCreated.toISOString(),
                timeUpdated: consumer.timeUpdated.toISOString()
              }))
              .sort((a, b) => b.timeUpdated.localeCompare(a.timeUpdated)),
        lastLoad: summary,
        ownerEmail: pipelineSlot.owner.email
      } satisfies PipelineInfoResponseValue;

      traceFlattenedObject(span, { loadSummary: summary });
      traceFlattenedObject(span, { pipelineFeeds });

      return info;
    });
  }

  /**
   * Accessible to public internet
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
   * capability for every pipeline this server manages.
   */
  public async handleCheckIn(
    req: GenericIssuanceCheckInRequest
  ): Promise<PodboxTicketActionResponseValue> {
    return traced(SERVICE_NAME, "handleCheckIn", async (span) => {
      logger(LOG_TAG, "handleCheckIn", str(req));

      // This is sub-optimal, but since tickets do not identify the pipelines
      // they come from, we have to match the ticket to the pipeline this way.
      const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
        req.credential.pcd
      );
      const signaturePCDValid =
        await SemaphoreSignaturePCDPackage.verify(signaturePCD);

      if (!signaturePCDValid) {
        throw new Error("credential signature invalid");
      }

      const payload: TicketActionPayload = JSON.parse(
        signaturePCD.claim.signedMessage
      );

      const eventId = payload.eventId;
      // TODO detect mismatch between eventId and ticketId?

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
   * Checks that a ticket could be checked in by the current user.
   */
  public async handlePreCheck(
    req: GenericIssuancePreCheckRequest
  ): Promise<ActionConfigResponseValue> {
    return traced(SERVICE_NAME, "handlePreCheck", async (span) => {
      logger(SERVICE_NAME, "handlePreCheck", str(req));

      // This is sub-optimal, but since tickets do not identify the pipelines
      // they come from, we have to match the ticket to the pipeline this way.
      const signaturePCD = await SemaphoreSignaturePCDPackage.deserialize(
        req.credential.pcd
      );
      const signaturePCDValid =
        await SemaphoreSignaturePCDPackage.verify(signaturePCD);

      if (!signaturePCDValid) {
        throw new Error("credential signature invalid");
      }

      const payload: TicketActionPayload = JSON.parse(
        signaturePCD.claim.signedMessage
      );

      const eventId = payload.eventId;
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
