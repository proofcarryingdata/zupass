import {
  FeedRequest,
  FeedResponse,
  ListFeedsRequest,
  ListFeedsResponse
} from "./RequestTypes";
import { Feed } from "./SubscriptionManager";

export interface HostedFeed {
  feed: Feed;
  handleRequest(request: FeedRequest): Promise<FeedResponse>;
}

export class FeedHost {
  private readonly hostedFeed: HostedFeed[];

  public constructor(feeds: HostedFeed[]) {
    this.hostedFeed = feeds;
  }

  public async handleFeedRequest(request: FeedRequest): Promise<FeedResponse> {
    const feed = this.hostedFeed.find((f) => f.feed.id === request.feedId);
    if (!feed) {
      throw new Error(`couldn't find feed with id ${request.feedId}`);
    }
    const response = await feed.handleRequest(request);
    return response;
  }

  public async handleListFeedsRequest(
    _request: ListFeedsRequest
  ): Promise<ListFeedsResponse> {
    return {
      feeds: this.hostedFeed.map((f) => f.feed)
    };
  }
}
