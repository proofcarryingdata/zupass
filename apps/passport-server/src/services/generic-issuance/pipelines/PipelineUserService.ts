import { IPipelineUserDB } from "../../../database/queries/pipelineUserDB";
import { logger } from "../../../util/logger";

const LOG_NAME = "UserService";
const LOG_TAG = `[${LOG_NAME}]`;

export class PipelineUserService {
  private userDB: IPipelineUserDB;

  public constructor(userDB: IPipelineUserDB) {
    this.userDB = userDB;
  }

  public async start(): Promise<void> {
    await this.maybeSetupAdmins();
  }

  private async maybeSetupAdmins(): Promise<void> {
    try {
      const adminEmailsFromEnv = this.userDB.getEnvAdminEmails();
      logger(LOG_TAG, `setting up generic issuance admins`, adminEmailsFromEnv);
      for (const email of adminEmailsFromEnv) {
        await this.userDB.setUserIsAdmin(email, true);
      }
    } catch (e) {
      logger(LOG_TAG, `failed to set up generic issuance admins`, e);
    }
  }
}
