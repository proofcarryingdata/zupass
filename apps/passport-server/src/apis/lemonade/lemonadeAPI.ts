import {
  ApolloClient,
  DefaultContext,
  DocumentNode,
  InMemoryCache,
  NormalizedCacheObject,
  gql
} from "@apollo/client/core";
import { Client, Issuer, type TokenSet } from "openid-client";

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
    backendUri: string,
    credentials: LemonadeOAuthCredentials
  ): Promise<LemonadeEvents>;

  getEventTicketTypes(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<LemonadeTicketTypes>;

  getTickets(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<LemonadeTickets>;

  checkinUser(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string,
    lemonadeUserId: string
  ): Promise<LemonadeCheckin>;
}

interface AuthTokenSource {
  getToken(credentials: LemonadeOAuthCredentials): Promise<string>;
}

interface CachedTokenIssuance {
  issuer: Issuer;
  client: Client;
  tokenSet: TokenSet;
}

class OAuthTokenManager implements AuthTokenSource {
  private cache: Map<string, CachedTokenIssuance>;

  public constructor() {
    this.cache = new Map();
  }

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
        return cached.tokenSet.access_token as string;
      }
    }

    const { oauthServerUrl, oauthClientId, oauthAudience, oauthClientSecret } =
      credentials;

    if (!issuer) {
      issuer = await Issuer.discover(oauthServerUrl);
    }

    if (!client) {
      client = new issuer.Client({
        client_id: oauthClientId,
        client_secret: oauthClientSecret
      });
    }

    const tokenSet = await client.grant({
      grant_type: "client_credentials",
      scope: ["audience"],
      audience: [oauthAudience]
    });

    if (!tokenSet.access_token) {
      throw new Error("Access token is not defined");
    }

    this.cache.set(cacheKey, { tokenSet, issuer, client });

    return tokenSet.access_token;
  }
}

/**
 * Wraps an Apollo GraphQL client. There is one client instance per backend
 * URL, so in practice there is likely to be only one instance.
 */
class LemonadeClient {
  private gqlClient: ApolloClient<NormalizedCacheObject>;

  public constructor(backendUri: string) {
    this.gqlClient = new ApolloClient({
      uri: backendUri,
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
   * Gets LemonadeTickets for an event. Number of tickets returned is
   * variable, and the caller is responsible for setting the `skip` and `limit`
   * values to control pagination.
   */
  public async getTickets(
    token: string,
    eventId: string,
    opts: { skip?: number; limit?: number } = { skip: 0, limit: 25 }
  ): Promise<LemonadeTickets> {
    const { getTickets } = await this.query<GetTicketsResponse>(
      token,
      getTicketsQuery,
      {
        event: eventId,
        ...opts
      }
    );

    return getTickets;
  }

  /**
   * Checks a given user in to an event.
   */
  public async checkinUser(
    token: string,
    opts: {
      // These are Lemonade IDs, names here match the GraphQL query
      event: string;
      user: string;
    }
  ): Promise<LemonadeCheckin> {
    const { checkinUser } = await this.mutate<CheckinUserResponse>(
      token,
      checkinUserMutation,
      opts
    );

    return checkinUser;
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
  private clients: Map<string, LemonadeClient>;
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
  private getClient(backendUri: string): LemonadeClient {
    if (!this.clients.has(backendUri)) {
      this.clients.set(backendUri, new LemonadeClient(backendUri));
    }
    return this.clients.get(backendUri) as LemonadeClient;
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
    backendUri: string,
    credentials: LemonadeOAuthCredentials
  ): Promise<LemonadeEvents> {
    const client = this.getClient(backendUri);
    const token = await this.getToken(credentials);

    return await this.paginate<LemonadeEvents[number]>((opts) =>
      client.getHostingEvents(token, opts)
    );
  }

  /**
   * Get all ticket types for an event.
   */
  public async getEventTicketTypes(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<LemonadeTicketTypes> {
    const client = this.getClient(backendUri);
    const token = await this.getToken(credentials);
    return await client.getEventTicketTypes(token, {
      input: { event: lemonadeEventId }
    });
  }

  /**
   * Get all tickets for an event.
   */
  public async getTickets(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<LemonadeTickets> {
    const client = this.getClient(backendUri);
    const token = await this.getToken(credentials);
    return await this.paginate<LemonadeTickets[number]>((opts) =>
      client.getTickets(token, lemonadeEventId, opts)
    );
  }

  /**
   * Check a user in for an event.
   */
  public async checkinUser(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string,
    lemonadeUserId: string
  ): Promise<LemonadeCheckin> {
    const client = this.getClient(backendUri);
    const token = await this.getToken(credentials);

    return await client.checkinUser(token, {
      event: lemonadeEventId,
      user: lemonadeUserId
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

export const getTicketsQuery = gql(`
  query GetTickets($skip: Int!, $limit: Int!, $event: MongoID) {
    getTickets(skip: $skip, limit: $limit, event: $event) {
      _id,
      assigned_to_expanded {
        _id
        name
        first_name
        last_name
        email
      }
      assigned_to
      assigned_email
      type
      accepted
    }
  }
`);

// Values seem to be nullable more often than one might expect
export interface GetTicketsResponse {
  getTickets: {
    _id: string;
    type: string; //-- id of the ticket type
    accepted?: boolean | null; //-- accepted = true means already checked in
    assigned_email?: string | null; // seems to be null even when assigned?
    assigned_to?: string | null; // a user ID
    assigned_to_expanded?: {
      _id: string; // user id
      name: string; // user id, e.g. 'robknight'
      first_name?: string;
      last_name?: string;
      email?: string;
    } | null;
  }[];
}

export type LemonadeTickets = GetTicketsResponse["getTickets"];
export type LemonadeTicket = LemonadeTickets[number];

export const checkinUserMutation = gql(`
  mutation CheckinUser($event: MongoID!, $user: MongoID!) {
    checkinUser(event: $event, user: $user) {
      messages {
        primary
        secondary
      }
      state,
    }
  }
`);

export interface CheckinUserResponse {
  checkinUser: {
    message: { primary: string; secondary?: string };
    state: "pending" | "payment" | "accepted" | "declined";
  };
}

export type LemonadeCheckin = CheckinUserResponse["checkinUser"];

export function getLemonadeAPI(): ILemonadeAPI {
  return new LemonadeAPI(undefined);
}
