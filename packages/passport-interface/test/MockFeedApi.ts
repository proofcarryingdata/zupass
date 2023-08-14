import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import {
  FeedHost,
  FeedRequest,
  FeedResponse,
  ListFeedsResponse,
  PCDPermissionType
} from "../src";
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
              description:
                "returns a new semaphore identity each time it's invoked",
              id: "1",
              name: "identity drip",
              permissions: [
                { folder: "TEST", type: PCDPermissionType.FolderReplace }
              ],
              inputPCDType: undefined,
              partialArgs: undefined
            },
            handleRequest: async (_req: FeedRequest) => {
              return {
                actions: [
                  {
                    pcds: [
                      await SemaphoreIdentityPCDPackage.serialize(
                        await SemaphoreIdentityPCDPackage.prove({
                          identity: new Identity()
                        })
                      )
                    ],
                    permission: {
                      folder: "TEST",
                      type: PCDPermissionType.FolderReplace
                    }
                  }
                ]
              };
            }
          }
        ])
      ]
    ]);
  }

  public getProviders(): string[] {
    return Array.from(this.feedHosts.keys());
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
