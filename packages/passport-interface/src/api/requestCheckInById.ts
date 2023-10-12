import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import urlJoin from "url-join";
import {
  CheckTicketInByIdError,
  CheckTicketInByIdRequest,
  CheckTicketInByIdResponseValue,
  ISSUANCE_STRING
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * Tries to check the user in. This is called by the Zupass client when
 * a 'superuser' of a particular event wants to check in a Devconnect
 * attendee into the event.
 *
 * Sends the ticket ID. See {@link requestCheckIn} for an alternative
 * API which sends a serialized PCD.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestCheckInById(
  passportServerUrl: string,
  postBody: CheckTicketInByIdRequest
): Promise<CheckTicketInByIdResult> {
  return httpPost<CheckTicketInByIdResult>(
    urlJoin(passportServerUrl, "/issue/check-in-by-id"),
    {
      // @todo - here and elsewhere - how can we do better than casting, and actually
      // make sure that the response we're getting back is the right shape?
      onValue: async (resText) =>
        JSON.parse(resText) as CheckTicketInByIdResult,
      onError: async () => ({ error: { name: "ServerError" }, success: false })
    },
    postBody
  );
}

/**
 * Generates a credential based on a semaphore identity and calls {@link requestCheckInById}
 * to try to check a ticket in.
 */
export async function checkinTicketById(
  passportServer: string,
  ticketId: string,
  checkerIdentity: Identity
): Promise<CheckTicketInByIdResult> {
  return requestCheckInById(passportServer, {
    ticketId,
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

export type CheckTicketInByIdResult = APIResult<
  CheckTicketInByIdResponseValue,
  CheckTicketInByIdError
>;
