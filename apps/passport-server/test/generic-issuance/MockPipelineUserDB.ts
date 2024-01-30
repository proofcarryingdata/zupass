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

  public async clearAllUsers(): Promise<void> {
    this.users = {};
  }

  public async setUser(user: PipelineUser): Promise<void> {
    this.users[user.id] = user;
  }

  public async getUser(userID: string): Promise<PipelineUser | undefined> {
    return this.users[userID];
  }

  public async getUserByEmail(
    userID: string
  ): Promise<PipelineUser | undefined> {
    return this.users[userID];
  }

  public async loadUsers(): Promise<PipelineUser[]> {
    return Object.values(this.users);
  }
}
