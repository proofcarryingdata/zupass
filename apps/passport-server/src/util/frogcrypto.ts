import {
  COMMON_TEMPERAMENT_SET,
  Rarity,
  Temperament
} from "@pcd/eddsa-frog-pcd";
import {
  FeedHost,
  FrogCryptoClientFeed,
  FrogCryptoFeed,
  ListFeedsRequest,
  ListFeedsResponseValue,
  ListSingleFeedRequest,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import _ from "lodash";
import { Pool } from "postgres-pool";
import { getFeedData } from "../database/queries/frogcrypto";
import { namedSqlTransaction } from "../database/sqlQuery";
import { PCDHTTPError } from "../routing/pcdHttpError";

export class FrogCryptoFeedHost extends FeedHost<FrogCryptoFeed> {
  private readonly dbPool: Pool;
  private readonly feedRequestHandler: (
    feed: FrogCryptoFeed
  ) => (request: PollFeedRequest) => Promise<PollFeedResponseValue>;
  private interval: ReturnType<typeof setInterval> | undefined;

  public constructor(
    dbPool: Pool,
    feedRequestHandler: (
      feed: FrogCryptoFeed
    ) => (request: PollFeedRequest) => Promise<PollFeedResponseValue>
  ) {
    super(
      [],
      `${process.env.PASSPORT_SERVER_URL}/frogcrypto/feeds`,
      "FrogCrypto"
    );
    this.dbPool = dbPool;
    this.feedRequestHandler = feedRequestHandler;
  }

  // TODO: use Postgres NOTIFY/LISTEN to update the list of feeds on demand
  public async start(): Promise<void> {
    await this.refreshFeeds();
    this.interval = setInterval(async () => {
      // Reload every minute
      await this.refreshFeeds();
    }, 60 * 1000);
  }

  public stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
    }
  }

  /**
   * Refetch the list of feeds that this server is hosting from the database.
   */
  public async refreshFeeds(): Promise<void> {
    const feeds = await namedSqlTransaction(
      this.dbPool,
      "refreshFeeds",
      (client) => getFeedData(client)
    );
    this.hostedFeed.length = 0;
    this.hostedFeed.push(
      ...feeds.map((feed) => ({
        feed,
        handleRequest: this.feedRequestHandler(feed)
      }))
    );
  }

  public getAllFeeds(): FrogCryptoFeed[] {
    return this.hostedFeed.map((f) => f.feed);
  }

  public handleFeedRequest(
    request: PollFeedRequest<PCDPackage>
  ): Promise<PollFeedResponseValue> {
    const feed = this.hostedFeed.find((f) => f.feed.id === request.feedId);
    if (!feed) {
      throw new PCDHTTPError(
        404,
        `couldn't find feed with id ${request.feedId}`
      );
    }
    if (feed.feed.activeUntil <= Date.now() / 1000) {
      throw new PCDHTTPError(
        404,
        `feed with id ${request.feedId} is not active`
      );
    }

    return feed.handleRequest(request);
  }

  /**
   * List all public feeds that this server is hosting.
   */
  public async handleListFeedsRequest(
    _request: ListFeedsRequest
  ): Promise<ListFeedsResponseValue> {
    return {
      providerName: this.providerName,
      providerUrl: this.providerUrl,
      feeds: this.hostedFeed
        .map((f) => f.feed)
        .filter((f) => !f.private)
        .map(sanitizeFeed)
    };
  }

  /**
   * List a single feed that this server is hosting.
   *
   * This also accept secret codes to look up a feed.
   */
  public async handleListSingleFeedRequest(
    _request: ListSingleFeedRequest
  ): Promise<ListFeedsResponseValue> {
    return {
      providerUrl: this.providerUrl,
      providerName: this.providerName,
      feeds: this.hostedFeed
        .filter(
          (f) =>
            f.feed.id === _request.feedId ||
            f.feed.codes?.includes(_request.feedId)
        )
        .map((f) => f.feed)
        .map(sanitizeFeed)
    };
  }
}

export function sampleFrogAttribute(
  min?: number,
  max?: number,
  rarity?: Rarity
): number {
  return _.random(
    Math.round(min ?? 0),
    Math.round(max ?? (rarity === Rarity.Common ? 7 : 15))
  );
}

export function parseFrogEnum(
  e: Record<number, string>,
  value: string
): number {
  const key = _.findKey(
    e,
    (v) =>
      typeof v === "string" &&
      v.toLowerCase() === value.toLowerCase().replace(/ /g, "")
  );
  if (key === undefined) {
    throw new Error(`invalid enum value ${value}`);
  }
  return parseInt(key);
}

export function parseFrogTemperament(value?: string): Temperament {
  if (!value) {
    return _.sample(COMMON_TEMPERAMENT_SET) ?? Temperament.N_A; // fallback makes TS happy
  }
  if (value === "N/A") {
    return Temperament.N_A;
  }
  if (value === "???") {
    return Temperament.UNKNOWN;
  }
  return parseFrogEnum(Temperament, value);
}

/**
 * Sanitize a feed object to return only feed data to the client.
 */
export function sanitizeFeed(feed: FrogCryptoFeed): FrogCryptoClientFeed {
  return {
    id: feed.id,
    name: feed.name,
    description: feed.description,
    permissions: feed.permissions,
    credentialRequest: feed.credentialRequest,
    autoPoll: feed.autoPoll,
    private: feed.private,
    activeUntil: feed.activeUntil,
    cooldown: feed.cooldown
  };
}
