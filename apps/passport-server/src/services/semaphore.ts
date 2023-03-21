import { ZuParticipant } from "@pcd/passport-interface";
import { Group } from "@semaphore-protocol/group";
import { Client } from "pg";
import { fetchPassportParticipants } from "../database/queries/fetchParticipant";
import { PassportParticipant } from "../database/types";

// Semaphore service maintains the Zuzalu participant semaphore groups.
export class SemaphoreService {
  // Zuzalu residents group
  public groupResi = new Group("1", 16);

  // Zuzalu participants by UUID
  participants = {} as Record<string, ZuParticipant>;

  // Get a participant by UUID, or null if not found.
  getParticipant(uuid: string): ZuParticipant | null {
    return this.participants[uuid] || null;
  }

  // Load participants from DB, rebuild semaphore groups
  async reload(dbClient: Client) {
    const ps = await fetchPassportParticipants(dbClient);
    this.participants = {};
    this.groupResi = new Group("1", 16);
    for (const p of ps) {
      this.addParticipant(p);
    }
  }

  // Add a single participant to the semaphore group
  addParticipant(participant: PassportParticipant) {
    const group = this.groupResi;
    if (participant.role !== "resident") {
      // TODO: support visitors
      throw new Error(`unsupported role ${participant.role}`);
    }

    const bigIntCommitment = BigInt(participant.commitment);
    if (group.indexOf(bigIntCommitment) >= 0) {
      throw new Error(`member ${bigIntCommitment} already in semaphore group`);
    }
    group.addMember(bigIntCommitment);
  }
}

export const semaphoreService = new SemaphoreService();
