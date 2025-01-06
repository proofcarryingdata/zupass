import {
  PipelineSemaphoreGroupInfo,
  SemaphoreGroupConfig
} from "@pcd/passport-interface";
import {
  SerializedSemaphoreGroup,
  deserializeSemaphoreGroup,
  serializeSemaphoreGroup
} from "@pcd/semaphore-group-pcd";
import { uuidToBigInt } from "@pcd/util";
import { Group } from "@semaphore-protocol/group";
import _ from "lodash";
import { PoolClient } from "postgres-pool";
import { IPipelineConsumerDB } from "../../database/queries/pipelineConsumerDB";
import { IPipelineSemaphoreHistoryDB } from "../../database/queries/pipelineSemaphoreHistoryDB";
import { sqlQueryWithPool } from "../../database/sqlQuery";
import { ApplicationContext } from "../../types";
import { traced } from "../telemetryService";
import { makeGenericIssuanceSemaphoreGroupUrl } from "./capabilities/SemaphoreGroupCapability";

/**
 * When a pipeline wants to trigger an update for a Semaphore group, it passes
 * an array of these objects to the Semaphore group provider, enabling matching
 * to group configuration and lookup of Semaphore ID from the consumer DB via
 * the email address attached to a ticket.
 */
export interface SemaphoreGroupTicketInfo {
  eventId: string;
  productId: string;
  email: string;
}

interface SemaphoreGroupChangeSet {
  toAdd: string[];
  toRemove: string[];
}

const SEMAPHORE_GROUP_DEPTH = 16;
const LOG_NAME = "SemaphoreGroupProvider";

/**
 * Provides reusable Semaphore group features for pipelines.
 */
export class SemaphoreGroupProvider {
  private context: ApplicationContext;
  // The semaphore group configuration from the pipeline definition.
  private groupConfigs: SemaphoreGroupConfig[];
  private consumerDB: IPipelineConsumerDB;
  private semaphoreHistoryDB: IPipelineSemaphoreHistoryDB;
  private pipelineId: string;
  // The in-memory representation of the latest groups, keyed by group ID.
  private groups: Map<string, Group>;

  public constructor(
    context: ApplicationContext,
    pipelineId: string,
    groupConfigs: SemaphoreGroupConfig[],
    consumerDB: IPipelineConsumerDB,
    semaphoreHistoryDB: IPipelineSemaphoreHistoryDB
  ) {
    this.context = context;
    this.groupConfigs = groupConfigs;
    this.consumerDB = consumerDB;
    this.pipelineId = pipelineId;
    this.semaphoreHistoryDB = semaphoreHistoryDB;
    // Groups are empty by default, but should be loaded from the history
    // tables in the DB using `loadFromHistory()`
    this.groups = new Map();
  }

  /**
   * Get the latest group from the in-memory representation.
   */
  private getLatestGroup(groupId: string): Group | undefined {
    return this.groups.get(groupId);
  }

  /**
   * Get the latest group as a {@link SerializedSemaphoreGroup}.
   */
  public async getSerializedLatestGroup(
    client: PoolClient,
    groupId: string
  ): Promise<SerializedSemaphoreGroup | undefined> {
    const group = await this.semaphoreHistoryDB.getLatestHistoryForGroup(
      client,
      this.pipelineId,
      groupId
    );
    if (!group) {
      return undefined;
    }
    const serializedGroup = JSON.parse(group.serializedGroup);
    return serializedGroup;
  }

  /**
   * Get the latest root hash for a group.
   */
  public async getLatestGroupRoot(
    client: PoolClient,
    groupId: string
  ): Promise<string | undefined> {
    const group = await this.semaphoreHistoryDB.getLatestHistoryForGroup(
      client,
      this.pipelineId,
      groupId
    );
    if (!group) {
      return undefined;
    }
    return group.rootHash;
  }

  /**
   * Get a historical group as a {@link SerializedSemaphoreGroup}.
   */
  public async getSerializedHistoricalGroup(
    client: PoolClient,
    groupId: string,
    rootHash: string
  ): Promise<SerializedSemaphoreGroup | undefined> {
    const group = await this.semaphoreHistoryDB.getHistoricalGroup(
      client,
      this.pipelineId,
      groupId,
      rootHash
    );
    if (!group) {
      return undefined;
    }
    const serializedGroup = JSON.parse(group.serializedGroup);
    return serializedGroup;
  }

  /**
   * Populates the in-memory groups with the latest history data. If we have
   * configuration for groups that are not present in the historical data,
   * initialize them as empty groups.
   * TODO: we have previously observed that deserializing a Semaphore group is
   * quite slow, as it rebuilds the Merkle tree from scratch. It would be worth
   * investigating whether we can save the tree itself, and restore from that,
   * which would save substantially on startup times.
   */
  public async start(): Promise<void> {
    return traced(LOG_NAME, "start", async (span) => {
      span?.setAttribute("pipeline_id", this.pipelineId);

      await sqlQueryWithPool(this.context.dbPool, async (client) => {
        // This should be called during pipeline startup.
        // If an exception throws, it will stop the pipeline from starting.
        const latestGroups =
          await this.semaphoreHistoryDB.getLatestGroupsForPipeline(
            client,
            this.pipelineId
          );

        const latestGroupMap = new Map(
          latestGroups.map((group) => [group.groupId, group])
        );

        for (const groupConfig of this.groupConfigs) {
          const historicalGroup = latestGroupMap.get(groupConfig.groupId);

          this.groups.set(
            groupConfig.groupId,
            historicalGroup
              ? await deserializeSemaphoreGroup(
                  JSON.parse(historicalGroup.serializedGroup)
                )
              : new Group(
                  uuidToBigInt(groupConfig.groupId),
                  SEMAPHORE_GROUP_DEPTH
                )
          );
        }

        span?.setAttribute("groups_in_db_count", latestGroupMap.size);
        span?.setAttribute("configured_groups_count", this.groupConfigs.length);

        const configuredGroupIds = new Set(
          this.groupConfigs.map((gc) => gc.groupId)
        );
        for (const groupId of latestGroupMap.keys()) {
          if (!configuredGroupIds.has(groupId)) {
            this.semaphoreHistoryDB.deleteGroupHistory(
              client,
              this.pipelineId,
              groupId
            );
          }
        }
      });
    });
  }

  /**
   * Updates the in-memory Semaphore groups using data on the current ticket
   * set.
   */
  public async update(
    client: PoolClient,
    data: SemaphoreGroupTicketInfo[]
  ): Promise<void> {
    return traced(LOG_NAME, "update", async (span) => {
      const groups = this.groupEmailsFromTicketData(data);

      span?.setAttribute("pipeline_id", this.pipelineId);
      span?.setAttribute("group_count", groups.size);

      for (const [groupConfig, emails] of groups.entries()) {
        await this.updateGroup(client, groupConfig, emails);
      }
    });
  }

  /**
   * Updates a single group's in-memory representation, and save it to the DB
   * if there have been any changes.
   *
   * We receive an array of { eventId, productId, email } objects, and
   * from the emails we can look up Semaphore IDs via the consumer DB. We use
   * the eventId/productId pairs to match configured Semaphore groups, and
   * build up membership sets for each group. We then compare that to the
   * in-memory representation, and then add or remove from the in-memory group
   * representation as required.
   */
  private async updateGroup(
    client: PoolClient,
    groupConfig: SemaphoreGroupConfig,
    emails: string[]
  ): Promise<void> {
    return traced(LOG_NAME, "updateGroup", async (span) => {
      const consumers =
        emails.length > 0
          ? await this.consumerDB.loadByEmails(client, this.pipelineId, emails)
          : [];

      const semaphoreIds = _.uniq(
        consumers.map((consumer) => consumer.commitment)
      );
      const group = this.groups.get(groupConfig.groupId);
      if (!group) {
        throw new Error(
          `Could not find group ${groupConfig.groupId} on pipeline ${this.pipelineId}`
        );
      }

      const { toAdd, toRemove } = SemaphoreGroupProvider.calculateGroupChanges(
        group,
        semaphoreIds
      );

      if (toAdd.length > 0 || toRemove.length > 0) {
        for (const newId of toAdd) {
          group.addMember(newId);
        }

        for (const deletedId of toRemove) {
          group.removeMember(group.indexOf(BigInt(deletedId)));
        }

        await this.semaphoreHistoryDB.addGroupHistoryEntry(
          client,
          this.pipelineId,
          groupConfig.groupId,
          group.root.toString(),
          JSON.stringify(serializeSemaphoreGroup(group, groupConfig.name))
        );
      }
      span?.setAttribute("pipeline_id", this.pipelineId);
      span?.setAttribute("emails_count", emails.length);
      span?.setAttribute("consumers_count", consumers.length);
      span?.setAttribute("group_id", groupConfig.groupId);
      span?.setAttribute("added_count", toAdd.length);
      span?.setAttribute("removed_count", toRemove.length);
      span?.setAttribute("total_members_after_update", group.members.length);
    });
  }

  /**
   * Calculates the changes to the group compared to the latest set of
   * members.
   */
  private static calculateGroupChanges(
    group: Group,
    latestMembers: string[]
  ): SemaphoreGroupChangeSet {
    const groupMembers = group.members
      .filter((m) => m !== group.zeroValue)
      .map((m) => m.toString());

    const groupMemberSet = new Set(groupMembers);

    const toAdd = latestMembers.filter((id) => !groupMemberSet.has(id));
    const latestMemberSet = new Set(latestMembers);
    const toRemove = groupMembers.filter(
      (id) => !latestMemberSet.has(id.toString())
    );

    return {
      toAdd,
      toRemove
    };
  }

  /**
   * Given data on the current set of tickets (specifically event ID, product
   * ID, and email), match these to configured Semaphore groups.
   */
  private groupEmailsFromTicketData(
    ticketDataList: SemaphoreGroupTicketInfo[]
  ): Map<SemaphoreGroupConfig, string[]> {
    // A mapping of group configurations to the email addresses which belong to
    // tickets matching the criteria set out in the group configuration.
    const groupConfigToEmailList = new Map<SemaphoreGroupConfig, string[]>();
    for (const groupConfig of this.groupConfigs) {
      const matchingEmails = ticketDataList
        .filter((ticketData) => {
          // If no criteria are specified, match all tickets
          if (groupConfig.memberCriteria.length === 0) {
            return true;
          }
          // See if the ticket matches any of the criteria for group membership
          for (const ticketSpec of groupConfig.memberCriteria) {
            if (
              ticketSpec.eventId === ticketData.eventId &&
              (!ticketSpec.productId ||
                ticketSpec.productId === ticketData.productId)
            ) {
              return true;
            }
          }
          return false;
        })
        .map((ticketData) => ticketData.email);
      groupConfigToEmailList.set(groupConfig, matchingEmails);
    }

    return groupConfigToEmailList;
  }

  public getSupportedGroups(): PipelineSemaphoreGroupInfo[] {
    return (this.groupConfigs ?? []).map((sg) => ({
      name: sg.name,
      groupId: sg.groupId,
      url: makeGenericIssuanceSemaphoreGroupUrl(this.pipelineId, sg.groupId),
      memberCount: this.getLatestGroup(sg.groupId)?.members.length ?? 0
    }));
  }
}
