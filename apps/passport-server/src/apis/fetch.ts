import { getErrorMessage } from "@pcd/util";
import { setError, traced } from "../services/telemetryService";
import { logger } from "../util/logger";
import { execWithRetry } from "../util/retry";

export function instrumentedFetch(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<Response> {
  return traced("Fetch", "fetch", async (span) => {
    if (typeof input === "string") {
      span?.setAttribute("url", input);
    }

    span?.setAttribute("method", init?.method ?? "GET");

    try {
      const result = await execWithRetry(
        () => {
          // eslint-disable-next-line no-restricted-globals
          return fetch(input, init);
        },
        (e) => {
          const errorMessage = getErrorMessage(e);
          return errorMessage.includes("other side closed");
        },
        3
      );

      span?.setAttribute("ok", result.ok);
      span?.setAttribute("statusCode", result.status);
      return result;
    } catch (e) {
      logger(e);
      setError(e, span);
      throw e;
    }
  });
}
