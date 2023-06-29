import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { ClientBase, Pool } from "pg";
import {
  CommitmentRow,
  HistoricSemaphoreGroup,
  ParticipantRole,
  PassportParticipant,
} from "../database/models";
import { fetchAllCommitments } from "../database/queries/fetchAllCommitments";
import {
  fetchHistoricGroupByRoot,
  fetchLatestHistoricSemaphoreGroups,
  insertNewHistoricSemaphoreGroup,
} from "../database/queries/historicSemaphore";
import { fetchAllLoggedInZuzaluUsers } from "../database/queries/zuzalu_pretix_tickets/fetchPretixParticipant";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

/**
 * Responsible for maintaining semaphore groups for all the categories of users
 * that PCDPass/Zupass is aware of.
 */
export class SemaphoreService {
  private interval: NodeJS.Timer | undefined;
  private groups: NamedGroup[];
  private dbPool: Pool | ClientBase;
  private isZuzalu: boolean;
  private loaded = false;

  public constructor(config: ApplicationContext) {
    this.dbPool = config.dbPool;
    this.isZuzalu = config.isZuzalu;
    this.groups = SemaphoreService.createGroups();
  }

  private static createGroups(): NamedGroup[] {
    return [
      { name: "Zuzalu Participants", group: new Group("1", 16) },
      { name: "Zuzalu Residents", group: new Group("2", 16) },
      { name: "Zuzalu Visitors", group: new Group("3", 16) },
      { name: "Zuzalu Organizers", group: new Group("4", 16) },
      { name: "Generic", group: new Group("5", 16) },
    ];
  }

  public groupParticipants = (): NamedGroup => this.getNamedGroup("1");
  public groupResidents = (): NamedGroup => this.getNamedGroup("2");
  public groupVisitors = (): NamedGroup => this.getNamedGroup("3");
  public groupOrganizers = (): NamedGroup => this.getNamedGroup("4");
  public groupGeneric = (): NamedGroup => this.getNamedGroup("5");

  public getNamedGroup(id: string): NamedGroup {
    const ret = this.groups.find((g) => g.group.id === id);
    if (!ret) throw new Error("Missing group " + id);
    return ret;
  }

  // Zuzalu participants by UUID
  private zuzaluParticipants = {} as Record<string, PassportParticipant>;
  private genericParticipants = {} as Record<string, CommitmentRow>;

  // Get a participant by UUID, or null if not found.
  public getParticipant(
    uuid: string
  ): PassportParticipant | CommitmentRow | null {
    // prevents client from thinking the user has been logged out
    // if semaphore service hasn't been initialized yet
    if (!this.loaded) {
      throw new Error("Semaphore service not loaded");
    }

    if (this.isZuzalu) {
      return this.zuzaluParticipants[uuid] || null;
    }

    return this.genericParticipants[uuid] || null;
  }

  public start(): void {
    // Reload every minute
    this.interval = setInterval(() => {
      this.reload();
    }, 60 * 1000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  // Load participants from DB, rebuild semaphore groups
  public async reload(): Promise<void> {
    return traced("Semaphore", "reload", async () => {
      logger(`[SEMA] Reloading semaphore service...`);

      if (this.isZuzalu) {
        await this.reloadZuzaluGroups();
      } else {
        await this.reloadGenericGroup();
      }

      this.loaded = true;

      logger(`[SEMA] Semaphore service reloaded.`);
      await this.saveHistoricSemaphoreGroups();
    });
  }

  private async reloadGenericGroup(): Promise<void> {
    return traced("Semaphore", "reloadGenericGroup", async (span) => {
      const allCommitments = await fetchAllCommitments(this.dbPool);
      span?.setAttribute("participants", allCommitments.length);
      logger(
        `[SEMA] Rebuilding groups, ${allCommitments.length} total participants.`
      );

      const namedGroup = this.getNamedGroup("5");
      const newGroup = new Group(
        namedGroup.group.id,
        namedGroup.group.depth,
        allCommitments.map((c) => c.commitment)
      );
      namedGroup.group = newGroup;
      this.genericParticipants = {};
      allCommitments.forEach((c) => {
        this.genericParticipants[c.uuid] = c;
      });
    });
  }

  private async saveHistoricSemaphoreGroups(): Promise<void> {
    if (!this.dbPool) {
      throw new Error("no database connection");
    }

    logger(`[SEMA] Semaphore service - diffing historic semaphore groups`);

    const latestGroups = await fetchLatestHistoricSemaphoreGroups(this.dbPool);

    for (const localGroup of this.groups) {
      const correspondingLatestGroup = latestGroups.find(
        (g) => g.groupId === localGroup.group.id
      );

      if (
        correspondingLatestGroup == null ||
        correspondingLatestGroup.rootHash !== localGroup.group.root.toString()
      ) {
        logger(
          `[SEMA] outdated semaphore group ${localGroup.group.id}` +
            ` - appending a new one into the database`
        );

        await insertNewHistoricSemaphoreGroup(
          this.dbPool,
          localGroup.group.id.toString(),
          localGroup.group.root.toString(),
          JSON.stringify(
            serializeSemaphoreGroup(localGroup.group, localGroup.name)
          )
        );
      } else {
        logger(
          `[SEMA] group '${localGroup.group.id}' is not outdated, not appending to group history`
        );
      }
    }
  }

  public async getHistoricSemaphoreGroup(
    groupId: string,
    rootHash: string
  ): Promise<HistoricSemaphoreGroup | undefined> {
    return fetchHistoricGroupByRoot(this.dbPool, groupId, rootHash);
  }

  public async getHistoricSemaphoreGroupValid(
    groupId: string,
    rootHash: string
  ): Promise<boolean> {
    const group = await fetchHistoricGroupByRoot(
      this.dbPool,
      groupId,
      rootHash
    );
    return group !== undefined;
  }

  public async getLatestSemaphoreGroups(): Promise<HistoricSemaphoreGroup[]> {
    return fetchLatestHistoricSemaphoreGroups(this.dbPool);
  }

  private async reloadZuzaluGroups(): Promise<void> {
    return traced("Semaphore", "reloadZuzaluGroups", async (span) => {
      const participants = await fetchAllLoggedInZuzaluUsers(this.dbPool);
      span?.setAttribute("participants", participants.length);
      logger(
        `[SEMA] Rebuilding groups, ${participants.length} total participants.`
      );

      // reset participant state
      this.zuzaluParticipants = {};
      this.groups = SemaphoreService.createGroups();

      const groupIdsToParticipants: Map<string, PassportParticipant[]> =
        new Map();
      const groupsById: Map<string, NamedGroup> = new Map();
      for (const group of this.groups) {
        groupIdsToParticipants.set(group.group.id.toString(), []);
        groupsById.set(group.group.id.toString(), group);
      }

      logger(`[SEMA] initializing ${this.groups.length} groups`);
      logger(`[SEMA] inserting ${participants.length} participants`);

      // calculate which participants go into which groups
      for (const p of participants) {
        this.zuzaluParticipants[p.uuid] = p;
        const groupsOfThisParticipant = this.getZuzaluGroupsForRole(p.role);
        for (const namedGroup of groupsOfThisParticipant) {
          logger(
            `[SEMA] Adding ${p.role} ${p.email} to sema group ${namedGroup.name}`
          );
          const participantsInGroup = groupIdsToParticipants.get(
            namedGroup.group.id.toString()
          );
          participantsInGroup?.push(p);
        }
      }

      // based on the above calculation, instantiate each semaphore group
      for (const entry of groupIdsToParticipants.entries()) {
        const groupParticipants = entry[1];
        const namedGroup = groupsById.get(entry[0]);

        if (namedGroup) {
          logger(
            `[SEMA] replacing group ${namedGroup.name} with ${groupParticipants.length} participants`
          );
          const participantIds = groupParticipants.map((p) => p.commitment);
          const newGroup = new Group(
            namedGroup.group.id,
            namedGroup.group.depth,
            participantIds
          );
          namedGroup.group = newGroup;
        }
      }
    });
  }

  // Get the semaphore groups for a participant role
  private getZuzaluGroupsForRole(role: ParticipantRole): NamedGroup[] {
    switch (role) {
      case ParticipantRole.Organizer:
        return [
          this.groupParticipants(),
          this.groupOrganizers(),
          this.groupResidents(),
        ];
      case ParticipantRole.Resident:
        return [this.groupParticipants(), this.groupResidents()];
      case ParticipantRole.Visitor:
        return [this.groupParticipants(), this.groupVisitors()];
      default:
        throw new Error(`unsupported role ${role}`);
    }
  }
}

export function startSemaphoreService(
  context: ApplicationContext
): SemaphoreService {
  const semaphoreService = new SemaphoreService(context);
  semaphoreService.start();
  semaphoreService.reload();
  return semaphoreService;
}

export interface NamedGroup {
  name: string;
  group: Group;
}
