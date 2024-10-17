import { PoolClient } from "postgres-pool";
import {
  fetchEmailToken,
  insertEmailToken
} from "../database/queries/emailToken";
import { randomEmailToken } from "../util/util";

/**
 * Responsible for generating, storing, and retrieving single-use
 * tokens that users use for logging in.
 */
export class EmailTokenService {
  public async checkTokenCorrect(
    client: PoolClient,
    email: string,
    token: string
  ): Promise<boolean> {
    const savedToken = await this.getTokenForEmail(client, email);
    if (!savedToken) {
      return false;
    }
    return token === savedToken;
  }

  public async getTokenForEmail(
    client: PoolClient,
    email: string
  ): Promise<string | null> {
    const token = await fetchEmailToken(client, email);
    return token;
  }

  public async saveNewTokenForEmail(
    client: PoolClient,
    email: string
  ): Promise<string> {
    const token = randomEmailToken();
    await insertEmailToken(client, { email, token });
    return token;
  }
}

export function startEmailTokenService(): EmailTokenService {
  return new EmailTokenService();
}
