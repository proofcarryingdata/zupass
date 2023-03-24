import { Group } from "@semaphore-protocol/group";
import { Client } from "pg";
import { PassportParticipant } from "../database/models";
import { fetchPassportParticipants } from "../database/queries/fetchParticipant";

// Semaphore service maintains the Zuzalu participant semaphore groups.
export class SemaphoreService {
  // Zuzalu residents group
  public groupResi = new Group("1", 16);

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
    this.groupResi = new Group("1", 16);
    for (const p of ps) {
      this.addParticipant(p);
    }
    console.log(`[SEMA] Semaphore service reloaded.`);
  }

  // Add a single participant to the semaphore group
  addParticipant(p: PassportParticipant) {
    console.log(`[SEMA] Adding ${p.role} ${p.email} to sema group: ${p.uuid}`);

    const group = this.groupResi;
    if (p.role !== "resident") {
      // TODO: support visitors
      throw new Error(`unsupported role ${p.role}`);
    }

    const bigIntCommitment = BigInt(p.commitment);
    if (group.indexOf(bigIntCommitment) >= 0) {
      throw new Error(`member ${bigIntCommitment} already in semaphore group`);
    }
    group.addMember(bigIntCommitment);

    this.participants[p.uuid] = p;
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
