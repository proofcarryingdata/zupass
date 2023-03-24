import { Group } from "@semaphore-protocol/group";
import { Client } from "pg";
import { ParticipantRole, PassportParticipant } from "../database/models";
import { fetchPassportParticipants } from "../database/queries/fetchParticipant";

// Semaphore service maintains the Zuzalu participant semaphore groups.
export class SemaphoreService {
  // Zuzalu residents group
  public groupResidents = new Group("1", 16);
  // Zuzalu visitors group
  public groupVisitors = new Group("2", 16);

  groups = [
    { name: "Zuzalu Residents", group: this.groupResidents },
    { name: "Zuzalu Visitors", group: this.groupVisitors },
  ];
  groupMap = new Map(this.groups.map((g) => [g.group.id.toString(), g]));

  getNamedGroup(id: string): NamedGroup | undefined {
    return this.groupMap.get(id);
  }

  // Zuzalu participants by UUID
  participants = {} as Record<string, PassportParticipant>;

  // Get a participant by UUID, or null if not found.
  getParticipant(uuid: string): PassportParticipant | null {
    return this.participants[uuid] || null;
  }

  // Load participants from DB, rebuild semaphore groups
  async reload(dbClient: Client) {
    console.log(`[SEMA] Reloading semaphore service...`);
    const ps = await fetchPassportParticipants(dbClient);
    console.log(`[SEMA] Rebuilding groups, ${ps.length} total participants.`);
    this.participants = {};
    this.groupResidents = new Group("1", 16);
    this.groupVisitors = new Group("1", 16);
    for (const p of ps) {
      this.addParticipant(p);
    }
    console.log(`[SEMA] Semaphore service reloaded.`);
  }

  // Add a single participant to the semaphore group
  addParticipant(p: PassportParticipant) {
    let group = this.getGroupForRole(p.role);
    console.log(`[SEMA] Adding ${p.role} ${p.email} to sema group ${group.id}`);

    const bigIntCommitment = BigInt(p.commitment);
    if (group.indexOf(bigIntCommitment) >= 0) {
      throw new Error(`member ${bigIntCommitment} already in semaphore group`);
    }
    group.addMember(bigIntCommitment);

    this.participants[p.uuid] = p;
  }

  // Get the semaphore group for a participant role
  getGroupForRole(role: ParticipantRole): Group {
    switch (role) {
      case ParticipantRole.Organizer:
      case ParticipantRole.Resident:
        return this.groupResidents;
      case ParticipantRole.Visitor:
        return this.groupVisitors;
      default:
        throw new Error(`unsupported role ${role}`);
    }
  }
}

export const semaphoreService = new SemaphoreService();

export function startSemaphoreService({ dbClient }: { dbClient: Client }) {
  semaphoreService.reload(dbClient);

  // Reload every minute
  setInterval(() => {
    semaphoreService.reload(dbClient);
  }, 60 * 1000);
}

export interface NamedGroup {
  name: string;
  group: Group;
}
