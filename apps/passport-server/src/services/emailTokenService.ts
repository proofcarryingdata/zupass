import {
  fetchEmailToken,
  insertEmailToken
} from "../database/queries/emailToken";
import { ApplicationContext } from "../types";
import { randomEmailToken } from "../util/util";

/**
 * Responsible for generating, storing, and retrieving single-use
 * tokens that users use for logging in.
 */
export class EmailTokenService {
  private context: ApplicationContext;

  public constructor(context: ApplicationContext) {
    this.context = context;
  }

  public async checkTokenCorrect(
    email: string,
    token: string
  ): Promise<boolean> {
    const savedToken = await this.getTokenForEmail(email);
    return token === savedToken;
  }

  public async getTokenForEmail(email: string): Promise<string | null> {
    const token = await fetchEmailToken(this.context.dbPool, email);
    return token;
  }

  public async saveNewTokenForEmail(email: string): Promise<string> {
    const token = randomEmailToken();
    await insertEmailToken(this.context.dbPool, { email, token });
    return token;
  }
}

export function startEmailTokenService(
  context: ApplicationContext
): EmailTokenService {
  const emailTokenService = new EmailTokenService(context);
  return emailTokenService;
}
