import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import urlJoin from "url-join";
import {
  ISSUANCE_STRING,
  OfflineDevconnectTicket,
  UploadOfflineCheckinsRequest,
  UploadOfflineCheckinsResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestOfflineTicketsCheckin(
  passportServerUrl: string,
  postBody: UploadOfflineCheckinsRequest
): Promise<OfflineTicketsCheckinResult> {
  return httpPostSimple(
    urlJoin(passportServerUrl, "/issue/checkin-offline-tickets"),
    async (resText) => ({
      success: true,
      value: JSON.parse(resText) as UploadOfflineCheckinsResponseValue
    }),
    postBody
  );
}

export async function offlineTicketsCheckin(
  passportServer: string,
  checkerIdentity: Identity,
  checkedOfflineInDevconnectTickets: OfflineDevconnectTicket[]
): Promise<OfflineTicketsCheckinResult> {
  return requestOfflineTicketsCheckin(passportServer, {
    checkedOfflineInDevconnectTicketIDs: checkedOfflineInDevconnectTickets.map(
      (t) => t.id
    ),
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

export type OfflineTicketsCheckinResult =
  APIResult<UploadOfflineCheckinsResponseValue>;
