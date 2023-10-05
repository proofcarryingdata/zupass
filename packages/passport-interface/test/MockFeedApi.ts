import {
  PCDActionType,
  PCDPermission,
  PCDPermissionType
} from "@pcd/pcd-collection";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { getErrorMessage } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import {
  FeedHost,
  ListFeedsResult,
  PollFeedRequest,
  PollFeedResult
} from "../src";
import { IFeedApi } from "../src/FeedAPI";
import { FeedCredentialPayload } from "../src/FeedCredential";

export class MockFeedApi implements IFeedApi {
  private feedHosts: Map<string, FeedHost>;

  public receivedPayload: FeedCredentialPayload | undefined;

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

              handleRequest: async (req: PollFeedRequest) => {
                const signaturePCD =
                  await SemaphoreSignaturePCDPackage.deserialize(req.pcd.pcd);

                const verified =
                  await SemaphoreSignaturePCDPackage.verify(signaturePCD);

                if (!verified) {
                  throw new Error("Invalid feed credential");
                }

                const payload: FeedCredentialPayload = JSON.parse(
                  signaturePCD.claim.signedMessage
                );

                // In the real world, we would call
                // `validateFeedCredentialTimestamp` here. But since this
                // has some (very small but still possible) chance of failing
                // if we happen to run the test close to the end of an hour,
                // this call is omitted.
                // @todo return to this when implementing better feed error
                // codes and retries.

                this.receivedPayload = payload;

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
              handleRequest: async (_req: PollFeedRequest) => {
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
            },
            {
              feed: {
                description: "returns nothing, but does require a credential",
                id: "3",
                name: "credential test",
                permissions: [],
                inputPCDType: undefined,
                partialArgs: undefined,
                credentialType: "email-pcd"
              },

              handleRequest: async (req: PollFeedRequest) => {
                const signaturePCD =
                  await SemaphoreSignaturePCDPackage.deserialize(req.pcd.pcd);

                const verified =
                  await SemaphoreSignaturePCDPackage.verify(signaturePCD);

                if (!verified) {
                  throw new Error("Invalid feed credential");
                }

                const payload: FeedCredentialPayload = JSON.parse(
                  signaturePCD.claim.signedMessage
                );

                this.receivedPayload = payload;

                return {
                  actions: []
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
