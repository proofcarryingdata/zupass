import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import urlJoin from "url-join";
import {
  GetOfflineTicketsRequest,
  GetOfflineTicketsResponseValue,
  ISSUANCE_STRING
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestOfflineTickets(
  passportServerUrl: string,
  postBody: GetOfflineTicketsRequest
): Promise<OfflineTicketsResult> {
  return httpPostSimple(
    urlJoin(passportServerUrl, "/issue/offline-tickets"),
    async (resText) => ({
      success: true,
      value: JSON.parse(resText) as GetOfflineTicketsResponseValue
    }),
    postBody
  );
}

export async function offlineTickets(
  passportServer: string,
  checkerIdentity: Identity
): Promise<OfflineTicketsResult> {
  return requestOfflineTickets(passportServer, {
    checkerProof: await SemaphoreSignaturePCDPackage.serialize(
      await SemaphoreSignaturePCDPackage.prove({
        identity: {
          argumentType: ArgumentTypeName.PCD,
          value: await SemaphoreIdentityPCDPackage.serialize(
            await SemaphoreIdentityPCDPackage.prove({
              identity: checkerIdentity
            })
          )
        },
        signedMessage: {
          argumentType: ArgumentTypeName.String,
          value: ISSUANCE_STRING
        }
      })
    )
  });
}

export type OfflineTicketsResult = APIResult<GetOfflineTicketsResponseValue>;
