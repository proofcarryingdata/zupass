import { PCDPackage } from "@pcd/pcd-types";
import { FeedRequest, FeedResponse, ListFeedsResponse } from "./RequestTypes";

export interface IFeedApi {
  pollFeed(providerUrl: string, request: FeedRequest): Promise<FeedResponse>;
  listFeeds(providerUrl: string): Promise<ListFeedsResponse>;
}

export class NetworkFeedApi implements IFeedApi {
  async pollFeed<T extends PCDPackage>(
    providerUrl: string,
    request: FeedRequest<T>
  ): Promise<FeedResponse> {
    const result = await fetch(providerUrl, {
      method: "POST",
      body: JSON.stringify(request),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
      }
    });
    const parsed = (await result.json()) as FeedResponse;
    return parsed;
  }

  async listFeeds(providerUrl: string): Promise<ListFeedsResponse> {
    const result = await fetch(providerUrl);
    const parsed = (await result.json()) as ListFeedsResponse;
    return parsed;
  }
}
