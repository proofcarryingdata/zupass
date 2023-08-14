import { FeedHost, FeedRequest, FeedResponse, ListFeedsResponse } from "../src";
import { IFeedApi } from "../src/FeedAPI";

export class MockFeedApi implements IFeedApi {
  private feedHosts: Map<string, FeedHost>;

  public constructor() {
    this.feedHosts = new Map([
      [
        "http://localhost:3000/feed",
        new FeedHost([
          {
            feed: {
              description: "description",
              id: "1",
              name: "test name",
              permissions: [],
              inputPCDType: "type",
              partialArgs: undefined
            },
            handleRequest: async (req: FeedRequest) => {
              return {
                actions: []
              };
            }
          }
        ])
      ]
    ]);
  }

  private getFeedHost(providerUrl: string): FeedHost {
    const host = this.feedHosts.get(providerUrl);
    if (!host) {
      throw new Error(
        `couldn't find feed host with provider url ${providerUrl}`
      );
    }
    return host;
  }

  public async pollFeed(
    providerUrl: string,
    request: FeedRequest
  ): Promise<FeedResponse> {
    const host = this.getFeedHost(providerUrl);
    return host.handleFeedRequest(request);
  }

  public async listFeeds(providerUrl: string): Promise<ListFeedsResponse> {
    const host = this.getFeedHost(providerUrl);
    return host.handleListFeedsRequest({});
  }
}
