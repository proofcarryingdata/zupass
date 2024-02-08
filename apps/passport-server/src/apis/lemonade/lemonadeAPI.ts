import {
  ApolloClient,
  DefaultContext,
  DocumentNode,
  InMemoryCache,
  NormalizedCacheObject,
  gql
} from "@apollo/client/core";
import { parse } from "csv-parse/sync";
import { Client, Issuer, type TokenSet } from "openid-client";
import urljoin from "url-join";
import { z } from "zod";
import { instrumentedFetch } from "../fetch";

/**
 * Credentials used for authenticating with Lemonade.
 */
export interface LemonadeOAuthCredentials {
  oauthAudience: string;
  oauthClientId: string;
  oauthClientSecret: string;
  oauthServerUrl: string;
}

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
 * To enable different auth token generation strategies in tests, provide an
 * interface that allows for swappable token generators.
 */
interface AuthTokenSource {
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
class OAuthTokenManager implements AuthTokenSource {
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
    return `${credentials.oauthAudience}${credentials.oauthClientId}${credentials.oauthClientSecret}${credentials.oauthServerUrl}`;
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

/**
 * Wraps an Apollo GraphQL client. There is one client instance per backend
 * URL, so in practice there is likely to be only one instance.
 */
class LemonadeGraphQLClient {
  private gqlClient: ApolloClient<NormalizedCacheObject>;

  public constructor(backendUrl: string) {
    this.gqlClient = new ApolloClient({
      uri: urljoin(backendUrl, "graphql"),
      cache: new InMemoryCache()
    });
  }

  /**
   * Generate HTTP headers for request context.
   */
  private getContextFromToken(token: string): DefaultContext {
    return {
      headers: {
        authorization: `Bearer ${token}`
      }
    };
  }

  /**
   * Perform a query (read).
   */
  private async query<T>(
    token: string,
    q: DocumentNode,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const res = await this.gqlClient.query({
      query: q,
      variables,
      context: this.getContextFromToken(token)
    });

    return res.data as T;
  }

  /**
   * Perform a mutation (write).
   */
  private async mutate<T>(
    token: string,
    m: DocumentNode,
    variables: Record<string, unknown> = {}
  ): Promise<T> {
    const res = await this.gqlClient.mutate({
      mutation: m,
      variables,
      context: this.getContextFromToken(token)
    });

    return res.data as T;
  }

  /**
   * Gets LemonadeEvents for the current user. Number of events returned is
   * variable, and the caller is responsible for setting the `skip` and `limit`
   * values to control pagination.
   */
  public async getHostingEvents(
    token: string,
    opts: { skip?: number; limit?: number } = { skip: 0, limit: 25 }
  ): Promise<LemonadeEvents> {
    const { getHostingEvents } = await this.query<GetHostingEventsResponse>(
      token,
      getHostingEventsQuery,
      opts
    );

    return getHostingEvents;
  }

  /**
   * Gets a LemonadeTicketTypes object for a given event. The returned object
   * contains an array of all ticket types, so there is no pagination to do
   * here.
   */
  public async getEventTicketTypes(
    token: string,
    opts: {
      input: { event: string };
    }
  ): Promise<LemonadeTicketTypes> {
    const { getEventTicketTypes } =
      await this.query<GetEventTicketTypesResponse>(
        token,
        getEventTicketTypesQuery,
        opts
      );

    return getEventTicketTypes;
  }

  /**
   * Updates a user's check-in state for an event.
   */
  public async updateEventCheckin(
    token: string,
    opts: {
      // These are Lemonade IDs, names here match the GraphQL query
      event: string;
      user: string;
      active: boolean;
    }
  ): Promise<LemonadeCheckin> {
    const { updateEventCheckin } =
      await this.mutate<UpdateEventCheckinResponse>(
        token,
        updateEventCheckinMutation,
        opts
      );

    return updateEventCheckin;
  }
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

export const getHostingEventsQuery = gql(`
  query GetHostingEvents($skip: Int!, $limit: Int!) {
    getHostingEvents(skip: $skip, limit: $limit) {
      _id,
      title,
      description
      start
      end
      url_go
      slug
      cover
      new_photos {
        url
      }
      guest_limit
      guest_limit_per
    }
  }
`);

export interface GetHostingEventsResponse {
  getHostingEvents: {
    _id: string;
    title: string;
    description?: string;
    start: string;
    end: string;
    url_go?: string;
    slug: string;
    cover?: string;
    new_photos?: { url: string }[];
    guest_limit?: number;
    guest_limit_per?: number;
  }[];
}

export type LemonadeEvents = GetHostingEventsResponse["getHostingEvents"];
export type LemonadeEvent = LemonadeEvents[number];

export const getEventTicketTypesQuery = gql(`
  query GetEventTicketTypes($input: GetEventTicketTypesInput!) {
    getEventTicketTypes(input: $input) {
      ticket_types {
        _id
        title
        prices {
          cost
          currency
          default
          network
        }
      }
    }
  }
`);

export interface GetEventTicketTypesResponse {
  getEventTicketTypes: {
    ticket_types: {
      _id: string;
      title: string;
      prices: {
        cost: string;
        currency: string;
        default?: boolean | null;
        network?: string | null;
      }[];
    }[];
  };
}

export type LemonadeTicketTypes =
  GetEventTicketTypesResponse["getEventTicketTypes"];
export type LemonadeTicketType = LemonadeTicketTypes["ticket_types"][number];

const LemonadeTicketSchema = z.object({
  _id: z.string(),
  assigned_email: z.string(),
  assigned_to: z.string(),
  user_id: z.string(),
  user_email: z.string(),
  type_id: z.string(),
  type_title: z.string(),
  checkin_date: z.string().transform((arg) => {
    try {
      const time = Date.parse(arg);
      if (!isNaN(time)) {
        return new Date(time);
      } else {
        return null;
      }
    } catch (e) {
      return null;
    }
  })
});

export type LemonadeTicket = z.infer<typeof LemonadeTicketSchema>;

export const updateEventCheckinMutation = gql(`
mutation UpdateEventCheckin($event: MongoID!, $user: MongoID!, $active: Boolean!) {
  updateEventCheckin(input: { event: $event, user: $user, active: $active })
}
`);

export interface UpdateEventCheckinResponse {
  updateEventCheckin: boolean;
}

export type LemonadeCheckin = UpdateEventCheckinResponse["updateEventCheckin"];

export function getLemonadeAPI(): ILemonadeAPI {
  return new LemonadeAPI(undefined);
}
