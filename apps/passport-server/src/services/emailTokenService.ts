import {
  fetchEmailToken,
  insertEmailToken
} from "../database/queries/emailToken";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { randomEmailToken } from "../util/util";

/**
 * Responsible for generating, storing, and retrieving single-use
 * tokens that users use for logging in.
 */
export class EmailTokenService {
  private context: ApplicationContext;
  private attempts: Record<string, number>;

  public constructor(context: ApplicationContext) {
    this.context = context;
    this.attempts = {};
  }

  public async checkTokenCorrect(
    email: string,
    token: string
  ): Promise<boolean> {
    if (this.attempts[email] !== undefined) {
      this.attempts[email]++;
    } else {
      this.attempts[email] = 1;
    }

    if (this.attempts[email] >= 100) {
      throw new PCDHTTPError(401, "Too many attempts. Come back later.");
    }

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
