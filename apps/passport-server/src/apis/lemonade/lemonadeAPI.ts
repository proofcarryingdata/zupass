import { parse } from "csv-parse/sync";
import urljoin from "url-join";
import { instrumentedFetch } from "../fetch";
import {
  AuthTokenSource,
  LemonadeOAuthCredentials,
  OAuthTokenManager
} from "./auth";
import { LemonadeGraphQLClient } from "./graphQLClient";
import {
  LemonadeCheckin,
  LemonadeEvent,
  LemonadeEvents,
  LemonadeTicket,
  LemonadeTicketSchema,
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
  ): Promise<LemonadeTicket[]>;

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
export class LemonadeAPI implements ILemonadeAPI {
  private clients: Map<string, LemonadeGraphQLClient>;
  private tokenSource: AuthTokenSource;

  public constructor(tokenSource: AuthTokenSource | undefined) {
    this.clients = new Map();
    this.tokenSource = tokenSource ?? new OAuthTokenManager();
  }

  /**
   * Lemonade API requests are authenticated using tokens. Make sure we have an
   * up-to-date token for each request.
   */
  private async getToken(
    credentials: LemonadeOAuthCredentials
  ): Promise<string> {
    return await this.tokenSource.getToken(credentials);
  }

  /**
   * Requests require clients, so we look up a previously-created client object
   * for this request, if one exists. Otherwise, we create and store a new one.
   */
  private getClient(backendUrl: string): LemonadeGraphQLClient {
    if (!this.clients.has(backendUrl)) {
      this.clients.set(backendUrl, new LemonadeGraphQLClient(backendUrl));
    }
    return this.clients.get(backendUrl) as LemonadeGraphQLClient;
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
    const client = this.getClient(backendUrl);
    const token = await this.getToken(credentials);

    return await this.paginate<LemonadeEvents[number]>((opts) =>
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
    const client = this.getClient(backendUrl);
    const token = await this.getToken(credentials);
    return await client.getEventTicketTypes(token, {
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
  ): Promise<LemonadeTicket[]> {
    const token = await this.getToken(credentials);
    const url = urljoin(backendUrl, "event", lemonadeEventId, "export/tickets");
    const result = await instrumentedFetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-type": "text/csv"
      }
    });
    const csvText = await result.text();
    const parsed = parse(csvText, {
      columns: true
    });
    const results = [];
    for (const row of parsed) {
      results.push(LemonadeTicketSchema.parse(row));
    }
    return results;
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
    const client = this.getClient(backendUrl);
    const token = await this.getToken(credentials);

    return await client.updateEventCheckin(token, {
      event: lemonadeEventId,
      user: lemonadeUserId,
      // Setting this to 'false' would cancel the check-in
      active: true
    });
  }
}

export function getLemonadeAPI(): ILemonadeAPI {
  return new LemonadeAPI(undefined);
}
