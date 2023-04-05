import { Group } from "@semaphore-protocol/group";
import { ClientBase, Pool } from "pg";
import { ParticipantRole, PassportParticipant } from "../database/models";
import { fetchPassportParticipants } from "../database/queries/fetchParticipant";

// Semaphore service maintains the Zuzalu participant semaphore groups.
export class SemaphoreService {
  // Groups by ID
  groups = SemaphoreService.createGroups();

  static createGroups(): NamedGroup[] {
    return [
      { name: "Zuzalu Participants", group: new Group("1", 16) },
      { name: "Zuzalu Residents", group: new Group("2", 16) },
      { name: "Zuzalu Visitors", group: new Group("3", 16) },
    ];
  }

  groupParticipants = () => this.getNamedGroup("1").group;
  groupResidents = () => this.getNamedGroup("2").group;
  groupVisitors = () => this.getNamedGroup("3").group;

  getNamedGroup(id: string): NamedGroup {
    const ret = this.groups.find((g) => g.group.id === id);
    if (!ret) throw new Error("Missing group " + id);
    return ret;
  }

  // Zuzalu participants by UUID
  participants = {} as Record<string, PassportParticipant>;

  // Get a participant by UUID, or null if not found.
  getParticipant(uuid: string): PassportParticipant | null {
    return this.participants[uuid] || null;
  }

  getParticipantByCommitment(commitment: string): PassportParticipant | null {
    const participants = Object.values(this.participants);
    for (const participant of participants) {
      if (participant.commitment === commitment) {
        return participant;
      }
    }
    return null;
  }

  // Load participants from DB, rebuild semaphore groups
  async reload(dbPool: ClientBase | Pool) {
    console.log(`[SEMA] Reloading semaphore service...`);
    const ps = await fetchPassportParticipants(dbPool);
    console.log(`[SEMA] Rebuilding groups, ${ps.length} total participants.`);
    this.participants = {};
    this.groups = SemaphoreService.createGroups();
    for (const p of ps) {
      this.addParticipant(p);
    }
    console.log(`[SEMA] Semaphore service reloaded.`);
  }

  // Add a single participant to the semaphore group
  addParticipant(p: PassportParticipant) {
    this.addParticipantToGroup(p, this.groupParticipants());

    const group = this.getGroupForRole(p.role);
    this.addParticipantToGroup(p, group);

    this.participants[p.uuid] = p;
  }

  addParticipantToGroup(p: PassportParticipant, group: Group) {
    console.log(`[SEMA] Adding ${p.role} ${p.email} to sema group ${group.id}`);
    const bigIntCommitment = BigInt(p.commitment);
    if (group.indexOf(bigIntCommitment) >= 0) {
      throw new Error(`member ${bigIntCommitment} already in semaphore group`);
    }
    group.addMember(bigIntCommitment);
  }

  // Get the semaphore group for a participant role
  getGroupForRole(role: ParticipantRole): Group {
    switch (role) {
      case ParticipantRole.Organizer:
      case ParticipantRole.Resident:
        return this.groupResidents();
      case ParticipantRole.Visitor:
        return this.groupVisitors();
      default:
        throw new Error(`unsupported role ${role}`);
    }
  }
}

export const semaphoreService = new SemaphoreService();

export function startSemaphoreService({ dbPool }: { dbPool: Pool }) {
  semaphoreService.reload(dbPool);

  // Reload every minute
  setInterval(() => {
    semaphoreService.reload(dbPool);
  }, 60 * 1000);
}

export interface NamedGroup {
  name: string;
  group: Group;
}
