import urlJoin from "url-join";
import { POST } from "./constants";

/**
 * Uploads a client-side-generated object to honeycomb. Used for
 * diagnosing client-side bugs.
 *
 * Never rejects.
 */
export async function requestLogToServer(
  passportServerUrl: string,
  eventName: string,
  value: object
): Promise<void> {
  try {
    await fetch(urlJoin(passportServerUrl, "client-log"), {
      ...POST,
      body: JSON.stringify({ name: eventName, ...value })
    });
  } catch (e) {
    console.log("failed to log event to server", e);
  }
}
