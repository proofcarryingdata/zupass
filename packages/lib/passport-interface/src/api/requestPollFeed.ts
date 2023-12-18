import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { PollFeedRequest, PollFeedResponseValue } from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks a feed for new PCDs.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestPollFeed(
  url: string,
  req: PollFeedRequest
): Promise<PollFeedResult> {
  return httpPostSimple(
    url,
    async (resText) => ({
      value: JSON.parse(resText) as PollFeedResponseValue,
      success: true
    }),
    req
  );
}

export async function pollFeed(
  feedUrl: string,
  identity: Identity,
  signedMessage: string,
  feedId: string
): Promise<PollFeedResult> {
  return requestPollFeed(feedUrl, {
    feedId,
    pcd: await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity
            })
          )
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: signedMessage
        }
      })
    )
  });
}

export type PollFeedResult = APIResult<PollFeedResponseValue>;
