import {
  PCDActionType,
  PCDPermission,
  PCDPermissionType
} from "@pcd/pcd-collection";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { FeedHost, FeedRequest, FeedResponse, ListFeedsResponse } from "../src";
import { IFeedApi } from "../src/FeedAPI";

export class MockFeedApi implements IFeedApi {
  private feedHosts: Map<string, FeedHost>;

  public constructor() {
    this.feedHosts = new Map<string, FeedHost>([
      [
        "http://localhost:3000/feed",
        new FeedHost(
          [
            {
              feed: {
                description:
                  "returns a new semaphore identity each time it's invoked",
                id: "1",
                name: "identity drip",
                permissions: [
                  {
                    folder: "TEST",
                    type: PCDPermissionType.ReplaceInFolder
                  } as PCDPermission
                ],
                inputPCDType: undefined,
                partialArgs: undefined
              },
              handleRequest: async (_req: FeedRequest) => {
                return {
                  actions: [
                    {
                      type: PCDActionType.ReplaceInFolder,
                      folder: "TEST",
                      pcds: [
                        await SemaphoreIdentityPCDPackage.serialize(
                          await SemaphoreIdentityPCDPackage.prove({
                            identity: new Identity()
                          })
                        )
                      ]
                    }
                  ]
                };
              }
            },
            {
              feed: {
                description: "returns actions that are not permitted",
                id: "2",
                name: "bad feed",
                permissions: [
                  {
                    folder: "TEST",
                    type: PCDPermissionType.ReplaceInFolder
                  } as PCDPermission
                ],
                inputPCDType: undefined,
                partialArgs: undefined
              },
              handleRequest: async (_req: FeedRequest) => {
                return {
                  actions: [
                    {
                      type: PCDActionType.ReplaceInFolder,
                      folder: "NOT TEST",
                      pcds: [
                        await SemaphoreIdentityPCDPackage.serialize(
                          await SemaphoreIdentityPCDPackage.prove({
                            identity: new Identity()
                          })
                        )
                      ]
                    }
                  ]
                };
              }
            }
          ],
          "http://localhost:3000/feed",
          "Mock Provider"
        )
      ]
    ]);
  }

  public getProviderUrls(): string[] {
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
