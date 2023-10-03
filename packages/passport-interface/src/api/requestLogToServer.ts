import urlJoin from "url-join";
import { POST } from "./constants";

/**
 * Uploads a client-side-generated object to honeycomb. Used for
 * diagnosing client-side bugs.
 *
 * Never rejects.
 */
export async function requestLogToServer(
  zupassServerUrl: string,
  eventName: string,
  value: object,
  jwt?: string
): Promise<void> {
  try {
    await fetch(urlJoin(zupassServerUrl, "client-log"), {
      ...POST,
      body: JSON.stringify({ name: eventName, ...value }),
      ...(jwt
        ? {
            headers: {
              authorization: jwt
            }
          }
        : {})
    });
  } catch (e) {
    console.log("failed to log event to server", e);
  }
}
