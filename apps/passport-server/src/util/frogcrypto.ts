import {
  TEMPERAMENT_MAX,
  TEMPERAMENT_MIN,
  Temperament
} from "@pcd/eddsa-frog-pcd";
import {
  FeedHost,
  FrogCryptoFeed,
  ListFeedsRequest,
  ListFeedsResponseValue,
  PollFeedRequest,
  PollFeedResponseValue
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import _ from "lodash";
import { Pool } from "postgres-pool";
import { getFeedData } from "../database/queries/frogcrypto";
import { PCDHTTPError } from "../routing/pcdHttpError";

export class FrogCryptoFeedHost extends FeedHost<FrogCryptoFeed> {
  private readonly dbPool: Pool;
  private readonly feedRequestHandler: (
    feed: FrogCryptoFeed
  ) => (request: PollFeedRequest) => Promise<PollFeedResponseValue>;
  private interval: NodeJS.Timer | undefined;
  private feeds: FrogCryptoFeed[];

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
    this.feeds = [];
  }

  // TODO: use Postgres NOTIFY/LISTEN to update the list of feeds on demand
  public start(): void {
    this.refreshFeeds();
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
    this.feeds = await getFeedData(this.dbPool);
    this.hostedFeed.length = 0;
    this.hostedFeed.push(
      ...this.feeds.map((feed) => ({
        feed,
        handleRequest: this.feedRequestHandler(feed)
      }))
    );
  }

  public getFeeds(): FrogCryptoFeed[] {
    return this.feeds;
  }

  public handleFeedRequest(
    request: PollFeedRequest<PCDPackage<any, any, any, any>>
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

  public async handleListFeedsRequest(
    _request: ListFeedsRequest
  ): Promise<ListFeedsResponseValue> {
    return {
      providerName: this.providerName,
      providerUrl: this.providerUrl,
      feeds: this.hostedFeed.map((f) => f.feed).filter((f) => !f.private)
    };
  }
}

export function sampleFrogAttribute(min?: number, max?: number): number {
  return _.random(Math.round(min || 0), Math.round(max || 10));
}

export function parseFrogEnum(
  e: Record<number, string>,
  value: string
): number {
  const key = _.findKey(e, (v) => v.toLowerCase() === value.toLowerCase());
  if (key === undefined) {
    throw new Error(`invalid enum value ${value}`);
  }
  return parseInt(key);
}

export function parseFrogTemperament(value?: string): Temperament {
  if (!value) {
    return _.random(TEMPERAMENT_MIN, TEMPERAMENT_MAX);
  }
  if (value === "N/A") {
    return Temperament.N_A;
  }
  if (value === "???") {
    return Temperament.UNKNOWN;
  }
  return parseFrogEnum(Temperament, value);
}
