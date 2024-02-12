import { ONE_DAY_MS } from "@pcd/util";
import {
  AuthToken,
  AuthTokenSource,
  LemonadeOAuthCredentials
} from "../../src/apis/lemonade/auth";

export class TestTokenSource implements AuthTokenSource {
  public called = 0;
  public async getToken(
    credentials: LemonadeOAuthCredentials
  ): Promise<AuthToken> {
    this.called++;
    return {
      expires_at_ms: Date.now() + ONE_DAY_MS,
      token: credentials.oauthClientId
    };
  }
}
