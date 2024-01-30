import { PipelineUser } from "../../services/generic-issuance/pipelines/types";

export interface IPipelineUserDB {
  loadUsers(): Promise<PipelineUser[]>;
  clearAllUsers(): Promise<void>;
  getUser(userID: string): Promise<PipelineUser | undefined>;
  getUserByEmail(email: string): Promise<PipelineUser | undefined>;
  setUser(user: PipelineUser): Promise<void>;
}
