import { ITicketData } from "@pcd/eddsa-ticket-pcd";
import { PipelineEdDSATicketZuAuthConfig } from "@pcd/passport-interface";
import urlJoin from "url-join";
import { CONSUMER_SERVER_URL } from "../../../constants";

/**
 * Requests a nonce (single-use) value to use as a watermark during the
 * generation of the ZK proof.
 */
export async function generateWatermark(): Promise<string> {
  const response = await fetch(urlJoin(CONSUMER_SERVER_URL, "auth/watermark"), {
    credentials: "include"
  });

  return await response.text();
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
export async function serverLogin(
  serialized: string,
  config: PipelineEdDSATicketZuAuthConfig[]
): Promise<Partial<ITicketData>> {
  const response = await fetch(urlJoin(CONSUMER_SERVER_URL, `auth/login`), {
    method: "POST",
    mode: "cors",
    credentials: "include",
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ pcd: serialized, config })
  });

  return await response.json();
}

/**
 * Verifies the user's authentication status by sending a GET request to the `consumer-server`.
 * If the user is authenticated it returns the ticket data saved in the current session, or false otherwise.
 */
export async function isLoggedIn(): Promise<Partial<ITicketData> | false> {
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
