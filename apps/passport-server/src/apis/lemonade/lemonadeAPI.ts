import { parse } from "csv-parse/sync";
import stringify from "fast-json-stable-stringify";
import urljoin from "url-join";
import { instrumentedFetch } from "../fetch";
import {
  AuthToken,
  AuthTokenSource,
  LemonadeOAuthCredentials,
  OAuthTokenManager
} from "./auth";
import { LemonadeClient } from "./client";
import {
  LemonadeCheckin,
  LemonadeEvent,
  LemonadeEvents,
  LemonadeTicketTypes
} from "./types";

/**
 * Matches the structure of Lemonade's GraphQL API.
 */
export interface ILemonadeAPI {
  getHostingEvents(
    backendUrl: string,
    credentials: LemonadeOAuthCredentials
  ): Promise<LemonadeEvent[]>;

  getEventTicketTypes(
    backendUrl: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<LemonadeTicketTypes>;

  getTickets(
    backendUrl: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<unknown[]>;

  checkinUser(
    backendUrl: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string,
    lemonadeUserId: string
  ): Promise<LemonadeCheckin>;
}

/**
 * Each Lemonade API request is made to a back-end URL, which varies only by
 * environment (unlike Pretix, the URL is the same for all users in the same
 * environment). The credentials are OAuth tokens, which need to be renewed
 * periodically.
 *
 * Following the convention of PretixAPI, a single instance of LemonadeAPI is
 * shared between all pipelines. This means that account-specific credentials
 * must be passed in on each API call.
 */
class LemonadeAPI implements ILemonadeAPI {
  private tokenSource: AuthTokenSource;
  private authTokens: Map<string, AuthToken>;

  public constructor(tokenSource: AuthTokenSource) {
    this.tokenSource = tokenSource;
    this.authTokens = new Map();
  }

  /**
   * Lemonade API requests are authenticated using tokens. Make sure we have an
   * up-to-date token for each request.
   */
  private async getToken(
    credentials: LemonadeOAuthCredentials
  ): Promise<string> {
    const credentialString = stringify(credentials);
    let token: AuthToken | undefined = this.authTokens.get(credentialString);

    // If we do not have a cached token or the token has expired, get a new one
    if (!token || token.expires_at_ms <= Date.now()) {
      token = await this.tokenSource.getToken(credentials);
      this.authTokens.set(credentialString, token);
    }

    return token.token;
  }

  /**
   * If we get an authorization failure on a request to the Lemonade back-end,
   * we should invalidate the token that was used.
   */
  private invalidateToken(credentials: LemonadeOAuthCredentials): void {
    const credentialString = stringify(credentials);
    this.authTokens.delete(credentialString);
  }

  /**
   * We have some shared pagination logic here. It works by fetching pages of
   * results, up to `limit` in size, then making subsequent requests which skip
   * previously-fetched results.
   */
  private async paginate<T>(
    query: ({ skip, limit }: { skip: number; limit: number }) => Promise<T[]>,
    limit = 25
  ): Promise<T[]> {
    const results = [];
    let page = [];

    // Lemonade's pagination approach works by setting an offset ('skip') into
    // the collection being fetched. This is vulnerable to the collection
    // changing between requests, but there's not much we can do about that.
    do {
      page = await query({
        // Skip over previously-fetched events
        skip: results.length,
        // Try to fetch `limit` number of events
        limit
      });
      results.push(...page);
      // If we received a full page, keep going, otherwise stop here
    } while (page.length === limit);

    return results;
  }

  /**
   * Get all events (restricted by credentials).
   */
  public async getHostingEvents(
    backendUrl: string,
    credentials: LemonadeOAuthCredentials
  ): Promise<LemonadeEvents> {
    const client = new LemonadeClient(backendUrl);
    const token = await this.getToken(credentials);

    return this.paginate<LemonadeEvents[number]>((opts) =>
      client.getHostingEvents(token, opts)
    );
  }

  /**
   * Get all ticket types for an event.
   */
  public async getEventTicketTypes(
    backendUrl: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<LemonadeTicketTypes> {
    const client = new LemonadeClient(backendUrl);
    const token = await this.getToken(credentials);
    return client.getEventTicketTypes(token, {
      input: { event: lemonadeEventId }
    });
  }

  /**
   * Get all tickets for an event.
   * Unlike the other calls, this does not use the GraphQL client.
   * Instead, it reads CSV data from a REST endpoint.
   */
  public async getTickets(
    backendUrl: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<unknown[]> {
    let token = await this.getToken(credentials);
    const url = urljoin(backendUrl, "event", lemonadeEventId, "export/tickets");
    let result = await instrumentedFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-type": "text/csv"
      }
    });
    if (result.status === 401) {
      // If we received an authentication failure, try again once with a new
      // token
      this.invalidateToken(credentials);
      token = await this.getToken(credentials);
      result = await instrumentedFetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-type": "text/csv"
        }
      });
    }
    const csvText = await result.text();
    const parsed = parse(csvText, {
      columns: true
    }) as unknown[];
    return parsed;
  }

  /**
   * Check a user in for an event.
   */
  public async checkinUser(
    backendUrl: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string,
    lemonadeUserId: string
  ): Promise<LemonadeCheckin> {
    const client = new LemonadeClient(backendUrl);
    const token = await this.getToken(credentials);

    return client.updateEventCheckin(token, {
      event: lemonadeEventId,
      user: lemonadeUserId,
      // Setting this to 'false' would cancel the check-in
      active: true
    });
  }
}

/**
 * Returns a Lemonade API object. If no AuthTokenSource is provided, use
 * OAuthTokenManager as the default.
 */
export function getLemonadeAPI(
  tokenSource: AuthTokenSource = new OAuthTokenManager()
): ILemonadeAPI {
  return new LemonadeAPI(tokenSource);
}
