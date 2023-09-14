import { ZuzaluUserRole } from "@pcd/passport-interface";
import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { Pool } from "postgres-pool";
import {
  CommitmentRow,
  HistoricSemaphoreGroup,
  LoggedinPCDpassUser,
  LoggedInZuzaluUser
} from "../database/models";
import {
  fetchAllCommitments,
  fetchCommitment,
  fetchCommitmentByUuid
} from "../database/queries/commitments";
import { fetchDevconnectSuperusersForEmail } from "../database/queries/devconnect_pretix_tickets/fetchDevconnectPretixTicket";
import {
  fetchHistoricGroupByRoot,
  fetchLatestHistoricSemaphoreGroups,
  insertNewHistoricSemaphoreGroup
} from "../database/queries/historicSemaphore";
import { fetchAllLoggedInZuzaluUsers } from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

/**
 * Responsible for maintaining semaphore groups for all the categories of users
 * that PCDpass/Zupass is aware of.
 */
export class SemaphoreService {
  private interval: NodeJS.Timer | undefined;
  private groups: NamedGroup[];
  private dbPool: Pool;
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
      { name: "PCDpass Users", group: new Group("5", 16) }
    ];
  }

  public groupParticipants = (): NamedGroup => this.getNamedGroup("1");
  public groupResidents = (): NamedGroup => this.getNamedGroup("2");
  public groupVisitors = (): NamedGroup => this.getNamedGroup("3");
  public groupOrganizers = (): NamedGroup => this.getNamedGroup("4");
  public groupPCDpass = (): NamedGroup => this.getNamedGroup("5");

  public getNamedGroup(id: string): NamedGroup {
    const ret = this.groups.find((g) => g.group.id === id);
    if (!ret) throw new PCDHTTPError(404, "Missing group " + id);
    return ret;
  }

  private zuzaluUsersByUUID = {} as Record<string, LoggedInZuzaluUser>;
  private zuzaluUsersByEmail = {} as Record<string, LoggedInZuzaluUser>;
  private pcdPassUsersbyUUID = {} as Record<string, CommitmentRow>;
  private pcdPassUsersByEmail = {} as Record<string, CommitmentRow>;

  /**
   * If the service has not loaded all the users into memory yet, throws an error.
   * Otherwise, if this is a Zuzalu server, returns the user, or `null` if the user does not exist.
   * Otherwise, if this is a PCDpass server, returns the user, or `null` if the user does not exist.
   */
  public async getUserByUUID(
    uuid: string
  ): Promise<LoggedInZuzaluUser | LoggedinPCDpassUser | null> {
    if (!this.loaded) {
      // prevents client from thinking the user has been logged out
      // if semaphore service hasn't been initialized yet
      throw new PCDHTTPError(503, "Semaphore service not loaded");
    }

    if (this.isZuzalu) {
      return this.zuzaluUsersByUUID[uuid] || null;
    }

    const commitment = await fetchCommitmentByUuid(this.dbPool, uuid);

    if (!commitment) {
      logger("[SEMA] no user with that email exists");
      return null;
    }

    const superuserPrivilages = await fetchDevconnectSuperusersForEmail(
      this.dbPool,
      commitment.email
    );

    const pcdpassUser: LoggedinPCDpassUser = {
      ...commitment,
      superuserEventConfigIds: superuserPrivilages.map(
        (s) => s.pretix_events_config_id
      )
    };

    return pcdpassUser;
  }

  /**
   * Gets a user by unique identitifier. Only retrieves users that have logged in
   * (which makes sense because only those users even have a uuid).
   */
  public async getUserByEmail(
    email: string
  ): Promise<LoggedInZuzaluUser | LoggedinPCDpassUser | null> {
    if (!this.loaded) {
      // prevents client from thinking the user has been logged out
      // if semaphore service hasn't been initialized yet
      throw new PCDHTTPError(503, "Semaphore service not loaded");
    }

    if (this.isZuzalu) {
      return this.zuzaluUsersByEmail[email] || null;
    }

    const commitment = await fetchCommitment(this.dbPool, email);

    if (!commitment) {
      logger("[SEMA] no user with that email exists");
      return null;
    }

    const superuserPrivilages = await fetchDevconnectSuperusersForEmail(
      this.dbPool,
      commitment.email
    );

    const pcdpassUser: LoggedinPCDpassUser = {
      ...commitment,
      superuserEventConfigIds: superuserPrivilages.map(
        (s) => s.pretix_events_config_id
      )
    };

    return pcdpassUser;
  }

  public start(): void {
    this.interval = setInterval(() => {
      // Reload every minute
      this.reload();
    }, 60 * 1000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  /**
   * Load users from DB, rebuild semaphore groups
   */
  public async reload(): Promise<void> {
    return traced("Semaphore", "reload", async () => {
      logger(`[SEMA] Reloading semaphore service...`);

      if (this.isZuzalu) {
        await this.reloadZuzaluGroups();
      } else {
        await this.reloadGenericGroup();
      }

      this.loaded = true;

      await this.saveHistoricSemaphoreGroups();
      logger(`[SEMA] Semaphore service reloaded.`);
    });
  }

  private async reloadGenericGroup(): Promise<void> {
    return traced("Semaphore", "reloadGenericGroup", async (span) => {
      const allCommitments = await fetchAllCommitments(this.dbPool);
      span?.setAttribute("users", allCommitments.length);
      logger(`[SEMA] Rebuilding groups, ${allCommitments.length} total users.`);

      const namedGroup = this.getNamedGroup("5");
      const newGroup = new Group(
        namedGroup.group.id,
        namedGroup.group.depth,
        allCommitments.map((c) => c.commitment)
      );
      namedGroup.group = newGroup;
      this.pcdPassUsersbyUUID = {};
      allCommitments.forEach((c) => {
        this.pcdPassUsersbyUUID[c.uuid] = c;
        this.pcdPassUsersByEmail[c.email] = c;
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
      const users = await fetchAllLoggedInZuzaluUsers(this.dbPool);
      span?.setAttribute("users", users.length);
      logger(`[SEMA] Rebuilding groups, ${users.length} total users.`);

      // reset user state
      this.zuzaluUsersByUUID = {};
      this.zuzaluUsersByEmail = {};
      this.groups = SemaphoreService.createGroups();

      const groupIdsToUsers: Map<string, LoggedInZuzaluUser[]> = new Map();
      const groupsById: Map<string, NamedGroup> = new Map();
      for (const group of this.groups) {
        groupIdsToUsers.set(group.group.id.toString(), []);
        groupsById.set(group.group.id.toString(), group);
      }

      logger(`[SEMA] initializing ${this.groups.length} groups`);
      logger(`[SEMA] inserting ${users.length} users`);

      // calculate which users go into which groups
      for (const p of users) {
        this.zuzaluUsersByUUID[p.uuid] = p;
        this.zuzaluUsersByEmail[p.email] = p;
        const groupsOfThisUser = this.getZuzaluGroupsForRole(p.role);
        for (const namedGroup of groupsOfThisUser) {
          logger(
            `[SEMA] Adding ${p.role} ${p.email} to sema group ${namedGroup.name}`
          );
          const usersInGroup = groupIdsToUsers.get(
            namedGroup.group.id.toString()
          );
          usersInGroup?.push(p);
        }
      }

      // based on the above calculation, instantiate each semaphore group
      for (const entry of groupIdsToUsers.entries()) {
        const groupUsers = entry[1];
        const namedGroup = groupsById.get(entry[0]);

        if (namedGroup) {
          logger(
            `[SEMA] replacing group ${namedGroup.name} with ${groupUsers.length} users`
          );
          const userIds = groupUsers.map((p) => p.commitment);
          const newGroup = new Group(
            namedGroup.group.id,
            namedGroup.group.depth,
            userIds
          );
          namedGroup.group = newGroup;
        }
      }
    });
  }

  // Get the semaphore groups for a participant role
  private getZuzaluGroupsForRole(role: ZuzaluUserRole): NamedGroup[] {
    switch (role) {
      case ZuzaluUserRole.Organizer:
        return [
          this.groupParticipants(),
          this.groupOrganizers(),
          this.groupResidents()
        ];
      case ZuzaluUserRole.Resident:
        return [this.groupParticipants(), this.groupResidents()];
      case ZuzaluUserRole.Visitor:
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
