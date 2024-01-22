import { PCDActionType, PCDPermissionType } from "@pcd/pcd-collection";
import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { getErrorMessage } from "@pcd/util";
import { Identity } from "@semaphore-protocol/identity";
import MockDate from "mockdate";
import {
  FeedHost,
  ListFeedsResult,
  PollFeedRequest,
  PollFeedResult
} from "../src";
import { IFeedApi } from "../src/FeedAPI";
import {
  FeedCredentialPayload,
  verifyFeedCredential
} from "../src/FeedCredential";

class MockFeedError extends Error {
  public code: number;
  public constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

export class MockFeedApi implements IFeedApi {
  private feedHosts: Map<string, FeedHost>;

  public receivedPayload: FeedCredentialPayload | undefined;

  public issuanceDisabled = false;

  public constructor(date?: Date) {
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
                  }
                ],
                inputPCDType: undefined,
                partialArgs: undefined,
                credentialRequest: {
                  signatureType: "sempahore-signature-pcd"
                }
              },

              handleRequest: async (req: PollFeedRequest) => {
                if (date) {
                  MockDate.set(date);
                }
                if (this.issuanceDisabled) {
                  throw new MockFeedError("Issuance disabled", 410);
                }
                const { payload } = await verifyFeedCredential(
                  req.pcd as SerializedPCD
                );
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
                  }
                ],
                inputPCDType: undefined,
                partialArgs: undefined,
                credentialRequest: {
                  signatureType: "sempahore-signature-pcd"
                }
              },
              handleRequest: async (req: PollFeedRequest) => {
                if (date) {
                  MockDate.set(date);
                }
                if (this.issuanceDisabled) {
                  throw new MockFeedError("Issuance disabled", 410);
                }
                const { payload } = await verifyFeedCredential(
                  req.pcd as SerializedPCD
                );
                this.receivedPayload = payload;

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
                credentialRequest: {
                  pcdType: "email-pcd",
                  signatureType: "sempahore-signature-pcd"
                }
              },

              handleRequest: async (req: PollFeedRequest) => {
                if (date) {
                  MockDate.set(date);
                }
                if (this.issuanceDisabled) {
                  throw new MockFeedError("Issuance disabled", 410);
                }
                const { payload } = await verifyFeedCredential(
                  req.pcd as SerializedPCD
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
      return {
        error: getErrorMessage(e),
        success: false,
        code: (e as MockFeedError).code
      };
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
