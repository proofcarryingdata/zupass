import { PCDActionType, PCDPermissionType } from "@pcd/pcd-collection";
import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { Identity as IdentityV3 } from "@pcd/semaphore-identity-v3-wrapper";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { getErrorMessage } from "@pcd/util";
import MockDate from "mockdate";
import {
  FeedHost,
  ListFeedsResult,
  PollFeedRequest,
  PollFeedResponseValue,
  PollFeedResult
} from "../src";
import {
  Credential,
  CredentialPayload,
  verifyCredential
} from "../src/Credential";
import { IFeedApi } from "../src/FeedAPI";

class MockFeedError extends Error {
  public code: number;
  public constructor(message: string, code: number) {
    super(message);
    this.code = code;
  }
}

async function extractPayload(
  credential: Credential
): Promise<CredentialPayload> {
  return JSON.parse(
    (await SemaphoreSignaturePCDPackage.deserialize(credential.pcd)).claim
      .signedMessage
  );
}

export class MockFeedApi implements IFeedApi {
  private feedHosts: Map<string, FeedHost>;

  public receivedPayload: CredentialPayload | undefined;

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

              handleRequest: async (
                req: PollFeedRequest
              ): Promise<PollFeedResponseValue> => {
                if (date) {
                  MockDate.set(date);
                }
                if (this.issuanceDisabled) {
                  throw new MockFeedError("Issuance disabled", 410);
                }
                await verifyCredential(req.pcd as SerializedPCD);
                this.receivedPayload = await extractPayload(
                  req.pcd as SerializedPCD
                );

                return {
                  actions: [
                    {
                      type: PCDActionType.ReplaceInFolder,
                      folder: "TEST",
                      pcds: [
                        await SemaphoreIdentityPCDPackage.serialize(
                          await SemaphoreIdentityPCDPackage.prove({
                            identityV3: new IdentityV3()
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
              handleRequest: async (
                req: PollFeedRequest
              ): Promise<PollFeedResponseValue> => {
                if (date) {
                  MockDate.set(date);
                }
                if (this.issuanceDisabled) {
                  throw new MockFeedError("Issuance disabled", 410);
                }
                await verifyCredential(req.pcd as SerializedPCD);
                this.receivedPayload = await extractPayload(
                  req.pcd as SerializedPCD
                );

                return {
                  actions: [
                    {
                      type: PCDActionType.ReplaceInFolder,
                      folder: "NOT TEST",
                      pcds: [
                        await SemaphoreIdentityPCDPackage.serialize(
                          await SemaphoreIdentityPCDPackage.prove({
                            identityV3: new IdentityV3()
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

              handleRequest: async (
                req: PollFeedRequest
              ): Promise<PollFeedResponseValue> => {
                if (date) {
                  MockDate.set(date);
                }
                if (this.issuanceDisabled) {
                  throw new MockFeedError("Issuance disabled", 410);
                }
                await verifyCredential(req.pcd as SerializedPCD);
                this.receivedPayload = await extractPayload(
                  req.pcd as SerializedPCD
                );

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
