import {
  PCDActionType,
  PCDPermission,
  PCDPermissionType
} from "@pcd/pcd-collection";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { getErrorMessage } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import {
  FeedHost,
  ListFeedsResult,
  PollFeedRequest,
  PollFeedResult
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
                {
                  folder: "TEST",
                  type: PCDPermissionType.ReplaceInFolder
                } as PCDPermission
              ],
              inputPCDType: undefined,
              partialArgs: undefined
            },
            handleRequest: async (_req: PollFeedRequest) => {
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
    request: PollFeedRequest
  ): Promise<PollFeedResult> {
    const host = this.getFeedHost(providerUrl);

    try {
      return {
        value: await host.handleFeedRequest(request),
        success: true
      };
    } catch (e) {
      return { error: getErrorMessage(e), success: false };
    }
  }

  public async listFeeds(providerUrl: string): Promise<ListFeedsResult> {
    const host = this.getFeedHost(providerUrl);
    try {
      return {
        value: await host.handleListFeedsRequest({}),
        success: true
      };
    } catch (e) {
      return { error: getErrorMessage(e), success: false };
    }
  }
}
