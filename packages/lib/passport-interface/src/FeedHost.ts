import {
  ListFeedsRequest,
  ListFeedsResponseValue,
  ListSingleFeedRequest,
  PollFeedRequest,
  PollFeedResponseValue
} from "./RequestTypes";
import { Feed } from "./SubscriptionManager";

export interface HostedFeed<IFeed extends Feed = Feed> {
  feed: IFeed;
  handleRequest(request: PollFeedRequest): Promise<PollFeedResponseValue>;
}

export class FeedHost<IFeed extends Feed = Feed> {
  protected readonly hostedFeed: HostedFeed<IFeed>[];
  protected readonly providerUrl: string;
  protected readonly providerName: string;

  public constructor(
    feeds: HostedFeed<IFeed>[],
    providerUrl: string,
    providerName: string
  ) {
    this.hostedFeed = feeds;
    this.providerUrl = providerUrl;
    this.providerName = providerName;
  }

  public getProviderUrl(): string {
    return this.providerUrl;
  }

  public getProviderName(): string {
    return this.providerName;
  }

  public async handleFeedRequest(
    request: PollFeedRequest
  ): Promise<PollFeedResponseValue> {
    const feed = this.hostedFeed.find((f) => f.feed.id === request.feedId);
    if (!feed) {
      throw new Error(`couldn't find feed with id ${request.feedId}`);
    }

    const response = await feed.handleRequest(request);
    return response;
  }

  public async handleListFeedsRequest(
    _request: ListFeedsRequest
  ): Promise<ListFeedsResponseValue> {
    return {
      providerName: this.providerName,
      providerUrl: this.providerUrl,
      feeds: this.hostedFeed.map((f) => f.feed)
    };
  }

  public hasFeedWithId(feedId: string): boolean {
    return this.hostedFeed.filter((f) => f.feed.id === feedId).length > 0;
  }

  public async handleListSingleFeedRequest(
    _request: ListSingleFeedRequest
  ): Promise<ListFeedsResponseValue> {
    return {
      providerUrl: this.providerUrl,
      providerName: this.providerName,
      feeds: this.hostedFeed
        .filter((f) => f.feed.id === _request.feedId)
        .map((f) => f.feed)
    };
  }
}
