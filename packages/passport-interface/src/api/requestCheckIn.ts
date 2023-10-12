import { EdDSATicketPCD, EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import urlJoin from "url-join";
import {
  CheckTicketInError,
  CheckTicketInRequest,
  CheckTicketInResponseValue,
  ISSUANCE_STRING
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * Tries to check the user in. This is called by the Zupass client when
 * a 'superuser' of a particular event wants to check in a Devconnect
 * attendee into the event.
 *
 * Sends a serialized PCD. See {@link requestCheckInById} for an alternative
 * API which sends only the ticket ID.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestCheckIn(
  zupassServerUrl: string,
  postBody: CheckTicketInRequest
): Promise<CheckTicketInResult> {
  return httpPost<CheckTicketInResult>(
    urlJoin(zupassServerUrl, "/issue/check-in"),
    {
      // @todo - here and elsewhere - how can we do better than casting, and actually
      // make sure that the response we're getting back is the right shape?
      onValue: async (resText) => JSON.parse(resText) as CheckTicketInResult,
      onError: async () => ({ error: { name: "ServerError" }, success: false })
    },
    postBody
  );
}

/**
 * Generates a credential based on a semaphore identity and calls {@link requestCheckIn}
 * to try to check a ticket in.
 */
export async function checkinTicket(
  zupassServerUrl: string,
  ticket: EdDSATicketPCD,
  checkerIdentity: Identity
): Promise<CheckTicketInResult> {
  return requestCheckIn(zupassServerUrl, {
    ticket: await EdDSATicketPCDPackage.serialize(ticket),
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

export type CheckTicketInResult = APIResult<
  CheckTicketInResponseValue,
  CheckTicketInError
>;
