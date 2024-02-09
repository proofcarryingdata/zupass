import stringify from "fast-json-stable-stringify";
import { Client, Issuer, TokenSet } from "openid-client";

/**
 * Credentials used for authenticating with Lemonade.
 */
export interface LemonadeOAuthCredentials {
  // These values are provided by Lemonade
  // Audience identifies the recipient, e.g. the Lemonade back-end
  oauthAudience: string;
  // This is a public identifier for the client
  oauthClientId: string;
  // Secret value for the client - should be hidden by default in UI
  oauthClientSecret: string;
  // The URL of the Lemonade OAuth server
  oauthServerUrl: string;
}

/**
 * To enable different auth token generation strategies in tests, provide an
 * interface that allows for swappable token generators.
 */
export interface AuthTokenSource {
  getToken(credentials: LemonadeOAuthCredentials): Promise<string>;
}

/**
 * In the OAuth token manager, we want to cache certain objects between calls,
 * as they contain reusable tokens or reusable OAuth data that can be used to
 * regenerate expired tokens.
 */
interface CachedTokenIssuance {
  issuer: Issuer;
  client: Client;
  tokenSet: TokenSet;
}

/**
 * Manages tokens fetched from an OAuth backend.
 */
export class OAuthTokenManager implements AuthTokenSource {
  // Cache TokenSet and other OAuth data
  // Key is a string containing the credentials and backend URL
  private cache: Map<string, CachedTokenIssuance>;

  public constructor() {
    this.cache = new Map();
  }

  /**
   * Turn OAuth credentials into a string. Doing it this way avoids possible
   * issues with JSON stringifying object keys in different orders.
   */
  private stringifyCredentials(credentials: LemonadeOAuthCredentials): string {
    return stringify(credentials);
  }

  /**
   * Return a previously-fetched token, if it has not yet expired.
   * If the previously-fetched token has expired, or no token has been fetched
   * yet, fetch a new one.
   *
   * This call may make third-party server requests and so may be slow.
   */
  public async getToken(
    credentials: LemonadeOAuthCredentials
  ): Promise<string> {
    if (
      !credentials.oauthAudience ||
      !credentials.oauthClientId ||
      !credentials.oauthClientSecret ||
      !credentials.oauthServerUrl
    ) {
      throw new Error("Invalid OAuth credentials");
    }

    let issuer: Issuer | undefined;
    let client: Client | undefined;

    const cacheKey = this.stringifyCredentials(credentials);
    if (this.cache.has(cacheKey)) {
      const cached = this.cache.get(cacheKey) as CachedTokenIssuance;
      issuer = cached.issuer;
      client = cached.client;
      if (
        cached.tokenSet.access_token &&
        cached.tokenSet.expires_at &&
        cached.tokenSet.expires_at * 1000 < Date.now()
      ) {
        // This is the happy path, and occurs most often
        return cached.tokenSet.access_token as string;
      }
    }

    const { oauthServerUrl, oauthClientId, oauthAudience, oauthClientSecret } =
      credentials;

    // We probably had a cached Issuer object, but if not then create a new one
    if (!issuer) {
      issuer = await Issuer.discover(oauthServerUrl);
    }

    // We probably have a cached OAuth client object, but if not then create a
    // new one
    if (!client) {
      client = new issuer.Client({
        client_id: oauthClientId,
        client_secret: oauthClientSecret
      });
    }

    // Get a new TokenSet
    const tokenSet = await client.grant({
      grant_type: "client_credentials",
      scope: ["audience"],
      audience: [oauthAudience]
    });

    // Make sure it has an access token
    if (!tokenSet.access_token) {
      throw new Error("Access token is not defined");
    }

    // Cache the TokenSet, Issuer, and Client
    this.cache.set(cacheKey, { tokenSet, issuer, client });

    return tokenSet.access_token;
  }
}
