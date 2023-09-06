import { setError, traced } from "../services/telemetryService";
import { logger } from "../util/logger";

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
      const result = await fetch(input, init);
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
