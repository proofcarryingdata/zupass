import { ZuzaluUserRole } from "@pcd/passport-interface";
import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import _ from "lodash";
import { Pool } from "postgres-pool";
import { HistoricSemaphoreGroup, LoggedInZuzaluUser } from "../database/models";
import {
  fetchHistoricGroupByRoot,
  fetchLatestHistoricSemaphoreGroups,
  insertNewHistoricSemaphoreGroup
} from "../database/queries/historicSemaphore";
import { fetchAllUsers } from "../database/queries/users";
import { fetchAllLoggedInZuconnectUsers } from "../database/queries/zuconnect/fetchZuconnectUsers";
import { fetchAllLoggedInZuzaluUsers } from "../database/queries/zuzalu_pretix_tickets/fetchZuzaluUser";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { zuconnectProductIdToZuzaluRole } from "../util/zuconnectTicket";
import { traced } from "./telemetryService";

type LoggedInZuzaluOrZuconnectUser = Pick<
  LoggedInZuzaluUser,
  "email" | "role" | "commitment"
>;

/**
 * Responsible for maintaining semaphore groups for all the categories of users
 * that Zupass is aware of.
 */
export class SemaphoreService {
  private interval: NodeJS.Timer | undefined;
  private groups: NamedGroup[];
  private dbPool: Pool;

  public groupParticipants = (): NamedGroup => this.getNamedGroup("1");
  public groupResidents = (): NamedGroup => this.getNamedGroup("2");
  public groupVisitors = (): NamedGroup => this.getNamedGroup("3");
  public groupOrganizers = (): NamedGroup => this.getNamedGroup("4");
  public groupEveryone = (): NamedGroup => this.getNamedGroup("5");

  public constructor(config: ApplicationContext) {
    this.dbPool = config.dbPool;
    this.groups = SemaphoreService.createGroups();
  }

  private static createGroups(): NamedGroup[] {
    return [
      // @todo: deprecate groups 1-4
      // Blocked on Zupoll, Zucast, and zuzalu.city
      { name: "Zuzalu Participants", group: new Group("1", 16) },
      { name: "Zuzalu Residents", group: new Group("2", 16) },
      { name: "Zuzalu Visitors", group: new Group("3", 16) },
      { name: "Zuzalu Organizers", group: new Group("4", 16) },
      { name: "Everyone", group: new Group("5", 16) }
    ];
  }

  public getNamedGroup(id: string): NamedGroup {
    const ret = this.groups.find((g) => g.group.id === id);
    if (!ret) throw new PCDHTTPError(404, "Missing group " + id);
    return ret;
  }

  public start(): void {
    this.interval = setInterval(() => {
      // Reload every minute
      this.scheduleReload();
    }, 60 * 1000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  public scheduleReload(): void {
    setTimeout(() => {
      this.reload().catch((e) => {
        logger("[SEMA] failed to reload", e);
      });
    }, 1);
  }

  /**
   * Load users from DB, rebuild semaphore groups
   */
  public async reload(): Promise<void> {
    return traced("Semaphore", "reload", async () => {
      logger(`[SEMA] Reloading semaphore service...`);

      await this.reloadZuzaluGroups();
      await this.reloadGenericGroup();
      await this.saveHistoricSemaphoreGroups();

      logger(`[SEMA] Semaphore service reloaded.`);
    });
  }

  private async reloadGenericGroup(): Promise<void> {
    return traced("Semaphore", "reloadGenericGroup", async (span) => {
      const allUsers = await fetchAllUsers(this.dbPool);
      span?.setAttribute("users", allUsers.length);
      logger(`[SEMA] Rebuilding groups, ${allUsers.length} total users.`);

      const namedGroup = this.getNamedGroup("5");
      const newGroup = new Group(
        namedGroup.group.id,
        namedGroup.group.depth,
        allUsers.map((c) => c.commitment)
      );
      namedGroup.group = newGroup;
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
      const zuzaluUsers: LoggedInZuzaluOrZuconnectUser[] =
        await fetchAllLoggedInZuzaluUsers(this.dbPool);
      const zuconnectUsers = await fetchAllLoggedInZuconnectUsers(this.dbPool);
      // Give Zuconnect users roles equivalent to Zuzalu roles
      const zuconnectUsersWithZuzaluRoles = zuconnectUsers.map((user) => {
        return {
          email: user.attendee_email,
          role: zuconnectProductIdToZuzaluRole(user.product_id),
          commitment: user.commitment
        };
      });
      // If the same user appears with the same role in both Zuzalu and
      // Zuconnect, only use one of them
      const users = _.uniqWith(
        zuzaluUsers.concat(zuconnectUsersWithZuzaluRoles),
        (a, b) =>
          a.role === b.role &&
          a.commitment === b.commitment &&
          a.email === b.email
      );
      span?.setAttribute("users", users.length);
      logger(`[SEMA] Rebuilding groups, ${users.length} total users.`);

      this.groups = SemaphoreService.createGroups();

      const groupIdsToUsers: Map<string, LoggedInZuzaluOrZuconnectUser[]> =
        new Map();
      const groupsById: Map<string, NamedGroup> = new Map();
      for (const group of this.groups) {
        groupIdsToUsers.set(group.group.id.toString(), []);
        groupsById.set(group.group.id.toString(), group);
      }

      logger(`[SEMA] initializing ${this.groups.length} groups`);
      logger(`[SEMA] inserting ${users.length} users`);

      // calculate which users go into which groups
      for (const p of users) {
        const groupsOfThisUser = this.getZuzaluGroupsForRole(p.role);
        for (const namedGroup of groupsOfThisUser) {
          logger(
            `[SEMA] Adding ${p.role} ${p.email} to sema group ${namedGroup.name}`
          );
          const usersInGroup = groupIdsToUsers.get(
            namedGroup.group.id.toString()
          );
          // The same user might appear twice, due to having both a Zuzalu and
          // Zuconnect ticket. However, there is no need to include them in a
          // group they are already a member of.
          if (
            !usersInGroup?.find(
              (user) =>
                user.commitment === p.commitment &&
                user.email === p.email &&
                user.role === p.role
            )
          ) {
            usersInGroup?.push(p);
          }
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
  semaphoreService.scheduleReload();
  return semaphoreService;
}

export interface NamedGroup {
  name: string;
  group: Group;
}
