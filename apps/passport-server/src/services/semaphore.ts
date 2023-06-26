import { serializeSemaphoreGroup } from "@pcd/semaphore-group-pcd";
import { Group } from "@semaphore-protocol/group";
import { ClientBase, Pool } from "pg";
import {
  CommitmentRow,
  ParticipantRole,
  PassportParticipant,
} from "../database/models";
import { fetchAllCommitments } from "../database/queries/fetchAllCommitments";
import {
  getGroupByRoot,
  getLatestSemaphoreGroups,
  HistoricSemaphoreGroup,
  insertNewSemaphoreGroup,
} from "../database/queries/historicSemaphore";
import { fetchPassportParticipants } from "../database/queries/pretix_users/fetchPretixParticipant";
import { traced } from "./telemetry";

// Semaphore service maintains the Zuzalu participant semaphore groups.
export class SemaphoreService {
  // Groups by ID
  groups = SemaphoreService.createGroups();
  dbPool: Pool | ClientBase | undefined;
  loaded = false;

  static createGroups(): NamedGroup[] {
    return [
      { name: "Zuzalu Participants", group: new Group("1", 16) },
      { name: "Zuzalu Residents", group: new Group("2", 16) },
      { name: "Zuzalu Visitors", group: new Group("3", 16) },
      { name: "Zuzalu Organizers", group: new Group("4", 16) },
      { name: "Generic", group: new Group("5", 16) },
    ];
  }

  setPool(dbPool: Pool | ClientBase) {
    this.dbPool = dbPool;
  }

  groupParticipants = () => this.getNamedGroup("1");
  groupResidents = () => this.getNamedGroup("2");
  groupVisitors = () => this.getNamedGroup("3");
  groupOrganizers = () => this.getNamedGroup("4");
  groupGeneric = () => this.getNamedGroup("5");

  getNamedGroup(id: string): NamedGroup {
    const ret = this.groups.find((g) => g.group.id === id);
    if (!ret) throw new Error("Missing group " + id);
    return ret;
  }

  // Zuzalu participants by UUID
  zuzaluParticipants = {} as Record<string, PassportParticipant>;
  genericParticipants = {} as Record<string, CommitmentRow>;

  // Get a participant by UUID, or null if not found.
  getParticipant(uuid: string): PassportParticipant | CommitmentRow | null {
    // prevents client from thinking the user has been logged out
    // if semaphore service hasn't been initialized yet
    if (!this.loaded) {
      throw new Error("Semaphore service not loaded");
    }

    return (
      this.zuzaluParticipants[uuid] || this.genericParticipants[uuid] || null
    );
  }

  // Load participants from DB, rebuild semaphore groups
  async reload() {
    return traced("Semaphore", "reload", async (span) => {
      if (!this.dbPool) {
        throw new Error("no database connection");
      }

      console.log(`[SEMA] Reloading semaphore service...`);
      const ps = await fetchPassportParticipants(this.dbPool);
      console.log(`[SEMA] Rebuilding groups, ${ps.length} total participants.`);
      this.setZuzaluGroups(ps);
      this.reloadGenericGroup();
      this.loaded = true;
      console.log(`[SEMA] Semaphore service reloaded.`);
      span?.setAttribute("participants", ps.length);
      this.saveHistoricSemaphoreGroups();
    });
  }

  private async reloadGenericGroup() {
    if (!this.dbPool) {
      throw new Error("no database connection");
    }

    const allCommitments = await fetchAllCommitments(this.dbPool);
    const namedGroup = this.getNamedGroup("5");
    const newGroup = new Group(
      namedGroup.group.id,
      namedGroup.group.depth,
      allCommitments.map((c) => c.commitment)
    );
    namedGroup.group = newGroup;
  }

  private async saveHistoricSemaphoreGroups() {
    if (!this.dbPool) {
      throw new Error("no database connection");
    }

    console.log(`[SEMA] Semaphore service - diffing historic semaphore groups`);

    const latestGroups = await getLatestSemaphoreGroups(this.dbPool);

    for (const localGroup of this.groups) {
      const correspondingLatestGroup = latestGroups.find(
        (g) => g.groupId === localGroup.group.id
      );

      if (
        correspondingLatestGroup == null ||
        correspondingLatestGroup.rootHash !== localGroup.group.root.toString()
      ) {
        console.log(
          `[SEMA] outdated semaphore group ${localGroup.group.id}` +
            ` - appending a new one into the database`
        );

        await insertNewSemaphoreGroup(
          this.dbPool,
          localGroup.group.id.toString(),
          localGroup.group.root.toString(),
          JSON.stringify(
            serializeSemaphoreGroup(localGroup.group, localGroup.name)
          )
        );
      } else {
        console.log(
          `[SEMA] group '${localGroup.group.id}' is not outdated, not appending to group history`
        );
      }
    }
  }

  public async getHistoricSemaphoreGroup(
    groupId: string,
    rootHash: string
  ): Promise<HistoricSemaphoreGroup | undefined> {
    if (!this.dbPool) {
      throw new Error("no database connection");
    }

    return getGroupByRoot(this.dbPool, groupId, rootHash);
  }

  public async getHistoricSemaphoreGroupValid(
    groupId: string,
    rootHash: string
  ): Promise<boolean> {
    if (!this.dbPool) {
      throw new Error("no database connection");
    }

    const group = await getGroupByRoot(this.dbPool, groupId, rootHash);

    return group !== undefined;
  }

  public async getLatestSemaphoreGroups(): Promise<HistoricSemaphoreGroup[]> {
    if (!this.dbPool) {
      throw new Error("no database connection");
    }

    return getLatestSemaphoreGroups(this.dbPool);
  }

  private setZuzaluGroups(participants: PassportParticipant[]) {
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

    console.log(`[SEMA] initializing ${this.groups.length} groups`);
    console.log(`[SEMA] inserting ${participants.length} participants`);

    // calculate which participants go into which groups
    for (const p of participants) {
      this.zuzaluParticipants[p.uuid] = p;
      const groupsOfThisParticipant = this.getZuzaluGroupsForRole(p.role);
      for (const namedGroup of groupsOfThisParticipant) {
        console.log(
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
        console.log(
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

export const semaphoreService = new SemaphoreService();

export function startSemaphoreService({ dbPool }: { dbPool: Pool }) {
  semaphoreService.setPool(dbPool);
  semaphoreService.reload();

  // Reload every minute
  setInterval(() => {
    semaphoreService.reload();
  }, 60 * 1000);
}

export interface NamedGroup {
  name: string;
  group: Group;
}
