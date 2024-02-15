import { IPipelineUserDB } from "../../src/database/queries/pipelineUserDB";
import { PipelineUser } from "../../src/services/generic-issuance/pipelines/types";

/**
 * For testing. In-memory representation of all the pipelines that
 * 'users' have created in the generic issuance backend.
 */
export class MockPipelineUserDB implements IPipelineUserDB {
  private users: { [id: string]: PipelineUser };

  public constructor() {
    this.users = {};
  }

  public async setUserAdmin(email: string, isAdmin: boolean): Promise<void> {
    const user = await this.getUserByEmail(email);
    if (user) {
      user.isAdmin = isAdmin;
    }
  }

  public async clearAllUsers(): Promise<void> {
    this.users = {};
  }

  public async setUser(
    user: Omit<PipelineUser, "timeCreated" | "timeUpdated">
  ): Promise<PipelineUser> {
    const updated = {
      ...user,
      timeUpdated: new Date(),
      timeCreated: this.users[user.id]?.timeCreated ?? new Date()
    };
    this.users[user.id] = updated;
    return updated;
  }

  public async getUser(userID: string): Promise<PipelineUser | undefined> {
    return this.users[userID];
  }

  public async getUserByEmail(
    email: string
  ): Promise<PipelineUser | undefined> {
    return Object.values(this.users).find((u) => (u.email = email));
  }

  public async loadUsers(): Promise<PipelineUser[]> {
    return Object.values(this.users);
  }
}
