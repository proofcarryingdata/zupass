import {
  ApolloClient,
  DefaultContext,
  DocumentNode,
  InMemoryCache,
  NormalizedCacheObject,
  gql
} from "@apollo/client/core";
import { Client, Issuer, type TokenSet } from "openid-client";
import { LemonadeDataMocker } from "../../../test/lemonade/LemonadeDataMocker";
import { MockLemonadeAPI } from "../../../test/lemonade/MockLemonadeAPI";

export interface LemonadeOAuthCredentials {
  oauthAudience: string;
  oauthClientId: string;
  oauthClientSecret: string;
  oauthServerUrl: string;
}

export interface IRealLemonadeAPI {
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

/**
 * TODO: implement to match the actual API
 */
export interface ILemonadeAPI {
  loadEvents(apiKey: string): Promise<LemonadeEvent[]>;
  checkinTicket(
    apiKey: string,
    eventId: string,
    ticketId: string
  ): Promise<void>;
  // TODO: fill in the other methods. This is what is planned so far:
  // - API Key scoped to an ‘account’, which has read/write permissions to
  //   the appropriate events. E.g. can read/write events that are owned/co-owned by the account.
  // - GET product types for a given event
  // - GET tickets for a given event, which will include
  //     - Attendee name
  //     - Attendee email
  //     - Product type (7-day, early bird, GA, etc)
  //     - Checked-in status
  // - POST Check-in (and potentially check-out)
}

interface AuthTokenSource {
  getToken(): Promise<string>;
}

class DummyTokenManager implements AuthTokenSource {
  public async getToken(): Promise<string> {
    return "dummyToken";
  }
}

class OAuthTokenManager implements AuthTokenSource {
  private credentials: LemonadeOAuthCredentials;
  private issuer: Issuer | undefined;
  private client: Client | undefined;
  private tokenSet: TokenSet | undefined;

  public constructor(credentials: LemonadeOAuthCredentials) {
    if (
      !credentials.oauthAudience ||
      !credentials.oauthClientId ||
      !credentials.oauthClientSecret ||
      !credentials.oauthServerUrl
    ) {
      throw new Error("Invalid OAuth credentials");
    }
    this.credentials = credentials;
  }

  /**
   * Return a previously-fetched token, if it has not yet expired.
   * If the previously-fetched token has expired, or no token has been fetched
   * yet, fetch a new one.
   *
   * This call may make third-party server requests and so may be slow.
   */
  public async getToken(): Promise<string> {
    const { oauthServerUrl, oauthClientId, oauthAudience, oauthClientSecret } =
      this.credentials;
    if (
      !this.tokenSet ||
      !this.tokenSet.access_token ||
      !this.tokenSet.expires_at ||
      this.tokenSet.expires_at * 1000 < Date.now()
    ) {
      if (!this.issuer) {
        this.issuer = await Issuer.discover(oauthServerUrl);
      }

      if (!this.client) {
        this.client = new this.issuer.Client({
          client_id: oauthClientId,
          client_secret: oauthClientSecret
        });
      }

      this.tokenSet = await this.client.grant({
        grant_type: "client_credentials",
        scope: ["audience"],
        audience: [oauthAudience]
      });
    }

    if (!this.tokenSet.access_token) {
      throw new Error("Access token is not defined");
    }

    return this.tokenSet.access_token;
  }
}

/**
 * Represents a client for a single Lemonade user account.
 * Contains utility methods for performing each of the possible requests, and
 * manages the lifecycle of the Apollo GraphQL client and OAuth tokens.
 */
class LemonadeClient {
  private gqlClient: ApolloClient<NormalizedCacheObject>;
  private tokenSource: AuthTokenSource;

  public constructor(backendUri: string, tokenSource: AuthTokenSource) {
    this.gqlClient = new ApolloClient({
      uri: backendUri,
      cache: new InMemoryCache()
    });
    this.tokenSource = tokenSource;
  }

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
    opts: { skip?: number; limit?: number } = { skip: 0, limit: 25 }
  ): Promise<LemonadeEvents> {
    const token = await this.tokenSource.getToken();
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
  public async getEventTicketTypes(opts: {
    input: { event: string };
  }): Promise<LemonadeTicketTypes> {
    const token = await this.tokenSource.getToken();
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
    eventId: string,
    opts: { skip?: number; limit?: number } = { skip: 0, limit: 25 }
  ): Promise<LemonadeTickets> {
    const token = await this.tokenSource.getToken();
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
  public async checkinUser(opts: {
    // These are Lemonade IDs, names here match the GraphQL query
    event: string;
    user: string;
  }): Promise<LemonadeCheckin> {
    const token = await this.tokenSource.getToken();
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
 * shared between all pipelines. This means that user-specific credentials must
 * be passed in on each API call.
 */
export class LemonadeAPI implements IRealLemonadeAPI {
  // To avoid regenerating OAuth tokens and the GraphQL client, we store client
  // objects between requests.
  private clients: Map<string, LemonadeClient>;
  private auth: boolean;

  public constructor(auth = true) {
    this.clients = new Map();
    this.auth = auth;
  }

  /**
   * Requests require clients, so we look up a previously-created client object
   * for this request, if one exists. Otherwise, we create and store a new one.
   */
  private getClient(
    backendUri: string,
    credentials: LemonadeOAuthCredentials
  ): LemonadeClient {
    // This ought to be unique for any given user of any given backend
    const key = `${credentials.oauthClientId}@${backendUri}`;
    if (!this.clients.has(key)) {
      this.clients.set(
        key,
        new LemonadeClient(backendUri, new DummyTokenManager())
      );
    }
    return this.clients.get(key) as LemonadeClient;
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

  public async getHostingEvents(
    backendUri: string,
    credentials: LemonadeOAuthCredentials
  ): Promise<LemonadeEvents> {
    const client = this.getClient(backendUri, credentials);

    return await this.paginate<LemonadeEvents[number]>((opts) =>
      client.getHostingEvents(opts)
    );
  }

  public async getEventTicketTypes(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<LemonadeTicketTypes> {
    const client = this.getClient(backendUri, credentials);
    return await client.getEventTicketTypes({
      input: { event: lemonadeEventId }
    });
  }

  public async getTickets(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string
  ): Promise<LemonadeTickets> {
    const client = this.getClient(backendUri, credentials);

    return await this.paginate<LemonadeTickets[number]>((opts) =>
      client.getTickets(lemonadeEventId, opts)
    );
  }

  public async checkinUser(
    backendUri: string,
    credentials: LemonadeOAuthCredentials,
    lemonadeEventId: string,
    lemonadeUserId: string
  ): Promise<LemonadeCheckin> {
    const client = this.getClient(backendUri, credentials);

    return await client.checkinUser({
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
        default?: boolean;
        network?: string;
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
  mutation($event: MongoID!, $user: MongoID!) {
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

/**
 * TODO: replace with production version once it exists. We have a placeholder
 * so that {@link GenericIssuanceService} is instantiated in non-testing environments.
 */
export function getLemonadeAPI(): ILemonadeAPI {
  const mockData = new LemonadeDataMocker();
  return new MockLemonadeAPI(mockData);
}
