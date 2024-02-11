import stringify from "fast-json-stable-stringify";
import { Client, Issuer } from "openid-client";

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
 * An authentication token for Lemonade back-end requests.
 */
export interface AuthToken {
  expires_at_ms: number; // Milliseconds since 1/1/1970
  token: string;
}

/**
 * To enable different auth token generation strategies in tests, provide an
 * interface that allows for swappable token generators.
 */
export interface AuthTokenSource {
  getToken(credentials: LemonadeOAuthCredentials): Promise<AuthToken>;
}

/**
 * The OAuth issuer object requires a network request to initialize. In order
 * to avoid making this request unnecessarily, we cache the initialized object.
 */
interface CachedOAuthClient {
  issuer: Issuer;
  client: Client;
}

/**
 * Manages tokens fetched from an OAuth backend.
 * Only ever used by {@link LemonadeAPI}.
 * Can be passed in to {@link getLemonadeAPI} as a parameter, but the default
 * parameter is `new OAuthTokenManager`, so it should never be necessary to
 * instantiate this class directly.
 */
export class OAuthTokenManager implements AuthTokenSource {
  // Cache TokenSet and other OAuth data
  // Key is a string containing the credentials and backend URL
  private clientCache: Map<string, CachedOAuthClient>;
  // Cache of in-progress requests for new tokens, to prevent concurrent
  // requests that might conflict with each other.
  private requestCache: Map<string, Promise<AuthToken>>;

  public constructor() {
    this.clientCache = new Map();
    this.requestCache = new Map();
  }

  /**
   * Get a new token from the OAuth backend.
   */
  private async getNewToken(
    credentials: LemonadeOAuthCredentials
  ): Promise<AuthToken> {
    let issuer: Issuer | undefined;
    let client: Client | undefined;

    const cacheKey = stringify(credentials);

    // Creating the client object involves making a "discovery" network request
    // We can avoid doing this by caching the client.
    if (this.clientCache.has(cacheKey)) {
      const cached = this.clientCache.get(cacheKey) as CachedOAuthClient;
      issuer = cached.issuer;
      client = cached.client;
    }

    const { oauthServerUrl, oauthClientId, oauthAudience, oauthClientSecret } =
      credentials;

    // If we do not already have an issuer object, create a new one
    if (!issuer) {
      issuer = await Issuer.discover(oauthServerUrl);
    }

    // If we do not already have a client object, create a new one
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

    if (!tokenSet.expires_at) {
      throw new Error("Token has no expiry timestamp");
    }

    // Cache the Issuer and Client objects
    this.clientCache.set(cacheKey, { issuer, client });

    return {
      token: tokenSet.access_token,
      expires_at_ms: tokenSet.expires_at * 1000
    };
  }

  /**
   * Fetches a new AuthToken. If there is currently an active request for this
   * set of credentials, return the promise for that request, otherwise create
   * a new request.
   *
   * This prevents concurrent requests for new tokens for the same credentials.
   */
  public getToken(credentials: LemonadeOAuthCredentials): Promise<AuthToken> {
    if (
      !credentials.oauthAudience ||
      !credentials.oauthClientId ||
      !credentials.oauthClientSecret ||
      !credentials.oauthServerUrl
    ) {
      throw new Error("Invalid OAuth credentials");
    }

    const credentialString = stringify(credentials);
    // Will retrieve a cached promise, if one exists
    let request = this.requestCache.get(credentialString);

    if (!request) {
      // Create a new request
      request = this.getNewToken(credentials);
      // Cache the request
      this.requestCache.set(credentialString, request);
      // When the request is complete, remove it from the cache, allowing new
      // requests to be made
      request.finally(() => this.requestCache.delete(credentialString));
    }

    return request;
  }
}
