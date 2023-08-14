import { Feed, FeedHost, FeedRequest, FeedResponse } from "../src";
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

  pollFeed(providerUrl: string, request: FeedRequest): Promise<FeedResponse> {
    throw new Error("Method not implemented.");
  }

  listFeeds(providerUrl: string): Promise<Feed[]> {
    throw new Error("Method not implemented.");
  }
}
