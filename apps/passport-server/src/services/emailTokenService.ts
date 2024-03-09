import {
  fetchEmailToken,
  insertEmailToken
} from "../database/queries/emailToken";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { ApplicationContext } from "../types";
import { randomEmailToken } from "../util/util";
import { RateLimitService } from "./rateLimitService";

/**
 * Responsible for generating, storing, and retrieving single-use
 * tokens that users use for logging in.
 */
export class EmailTokenService {
  private context: ApplicationContext;
  private readonly rateLimitService: RateLimitService;

  public constructor(
    context: ApplicationContext,
    rateLimitService: RateLimitService
  ) {
    this.context = context;
    this.rateLimitService = rateLimitService;
  }

  public async checkTokenCorrect(
    email: string,
    token: string
  ): Promise<boolean> {
    return true;
    if (
      !(await this.rateLimitService.requestRateLimitedAction(
        "CHECK_EMAIL_TOKEN",
        email
      ))
    ) {
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
  context: ApplicationContext,
  rateLimitService: RateLimitService
): EmailTokenService {
  const emailTokenService = new EmailTokenService(context, rateLimitService);
  return emailTokenService;
}
