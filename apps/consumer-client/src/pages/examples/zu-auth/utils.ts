import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  constructZupassPcdGetRequestUrl,
  getWithoutProvingUrl,
  openZupassPopup
} from "@pcd/passport-interface";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  EdDSATicketFieldsToReveal,
  ZKEdDSAEventTicketPCDArgs,
  ZKEdDSAEventTicketPCDPackage
} from "@pcd/zk-eddsa-event-ticket-pcd";
import urlJoin from "url-join";
import { CONSUMER_SERVER_URL, ZUPASS_URL } from "../../../constants";

/**
 * Requests a one-time challenge (nonce) for authentication with an EdDSA ticket PCD
 * from the `consumer-server`.
 */
export async function generateNonce(): Promise<string> {
  const response = await fetch(urlJoin(CONSUMER_SERVER_URL, "auth/nonce"), {
    credentials: "include"
  });

  return await response.text();
}

/**
 * Opens a Zupass popup to make a proof of a ZK EdDSA event ticket PCD.
 */
export function openZKEdDSAEventTicketPopup(
  fieldsToReveal: EdDSATicketFieldsToReveal,
  watermark: bigint,
  validEventIds: string[],
  validProductIds: string[]
): void {
  const args: ZKEdDSAEventTicketPCDArgs = {
    ticket: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: EdDSATicketPCDPackage.name,
      value: undefined,
      userProvided: true,
      validatorParams: {
        eventIds: validEventIds,
        productIds: validProductIds,
        notFoundMessage: "No eligible PCDs found"
      }
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: undefined,
      userProvided: true
    },
    validEventIds: {
      argumentType: ArgumentTypeName.StringArray,
      value: validEventIds.length != 0 ? validEventIds : undefined,
      userProvided: false
    },
    fieldsToReveal: {
      argumentType: ArgumentTypeName.ToggleList,
      value: fieldsToReveal,
      userProvided: false
    },
    watermark: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    },
    externalNullifier: {
      argumentType: ArgumentTypeName.BigInt,
      value: watermark.toString(),
      userProvided: false
    }
  };

  const popupUrl = window.location.origin + "#/popup";

  const proofUrl = constructZupassPcdGetRequestUrl<
    typeof ZKEdDSAEventTicketPCDPackage
  >(ZUPASS_URL, popupUrl, ZKEdDSAEventTicketPCDPackage.name, args, {
    genericProveScreen: true,
    title: "ZKEdDSA Ticket Proof",
    description: "ZKEdDSA Ticket PCD Request"
  });

  openZupassPopup(popupUrl, proofUrl);
}

/**
 * Initiates the logout process by sending a DELETE request to the `consumer-server`,
 * and updates the current session's state variable accordingly.
 */
export async function logout(): Promise<void> {
  await fetch(urlJoin(CONSUMER_SERVER_URL, "auth/logout"), {
    credentials: "include",
    method: "DELETE"
  });
}

/**
 * Performs server-side validation (PCD + challenge) for an EdDSA ticket PCD by sending a POST
 * request to the `consumer-server`, and updates the current session's state variable.
 *
 * @param serialized The stringified serialized form of an EdDSATicketPCD.
 */
export async function authenticate(serialized: string): Promise<any> {
  const { pcd } = JSON.parse(serialized);

  const response = await fetch(urlJoin(CONSUMER_SERVER_URL, `auth/login`), {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ pcd })
  });

  return await response.json();
}

/**
 * Verifies the user's authentication status by sending a GET request to the `consumer-server`.
 * If the user is authenticated it returns the ticket data saved in the current session, or false otherwise.
 */
export async function isLoggedIn(): Promise<any | false> {
  const response = await fetch(urlJoin(CONSUMER_SERVER_URL, "auth/logged-in"), {
    method: "GET",
    mode: "cors",
    credentials: "include",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    }
  });

  return await response.json();
}

/**
 * Returns a PCD from Zupass without requesting a proof.
 */
export async function getProofWithoutProving(): Promise<void> {
  const url = getWithoutProvingUrl(
    ZUPASS_URL,
    window.location.origin + "#/popup",
    EdDSATicketPCDPackage.name
  );

  const popupUrl = `#/popup?proofUrl=${encodeURIComponent(url)}`;

  window.open(popupUrl, "_blank", "width=450,height=600,top=100,popup");
}
