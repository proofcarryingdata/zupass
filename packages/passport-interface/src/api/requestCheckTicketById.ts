import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import urlJoin from "url-join";
import {
  CheckTicketByIdRequest,
  CheckTicketByIdResponseValue,
  ISSUANCE_STRING,
  TicketError
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPost } from "./makeRequest";

/**
 * For Devconnect tickets, pre-check a ticket before attempting check-in.
 *
 * Sends only the ticket ID. See {@link requestCheckTicket} for an
 * alternative API which sends a serialized PCD.
 *
 * Does NOT check in the user, rather checks whether the ticket is valid and
 * can be used to check in.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestCheckTicketById(
  passportServerUrl: string,
  postBody: CheckTicketByIdRequest
): Promise<CheckTicketByIdResult> {
  return httpPost<CheckTicketByIdResult>(
    urlJoin(passportServerUrl, "/issue/check-ticket-by-id"),
    {
      onValue: async (resText) => JSON.parse(resText) as CheckTicketByIdResult,
      onError: async (): Promise<CheckTicketByIdResult> => ({
        error: { name: "ServerError" },
        success: false
      })
    },
    postBody
  );
}

/**
 * Generates a credential based on a semaphore identity and calls {@link requestCheckInById}
 * to try to pre-check a ticket for check-in.
 */
export async function checkTicketById(
  passportServer: string,
  ticketId: string,
  checkerIdentity: Identity
): Promise<CheckTicketByIdResult> {
  return requestCheckTicketById(passportServer, {
    ticketId,
    signature: await SemaphoreSignaturePCDPackage.serialize(
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

export type CheckTicketByIdResult = APIResult<
  CheckTicketByIdResponseValue,
  TicketError
>;
