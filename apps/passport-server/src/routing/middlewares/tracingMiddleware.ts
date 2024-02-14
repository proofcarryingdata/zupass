import { NextFunction, Request, RequestHandler, Response } from "express";
import { traced } from "../../services/telemetryService";
import { logger } from "../../util/logger";

/**
 * Express middleware that traces all HTTP requests to HoneyComb. This
 * makes it possible to inspect the performance characteristics of all
 * HTTP requests.
 */
export function tracingMiddleware(): RequestHandler {
  logger("[TRACING] setting up middleware");
  return (req: Request, res: Response, next: NextFunction) => {
    traced(
      "Express",
      "request",
      async (span) => {
        span?.setAttribute("url", req.originalUrl);
        span?.setAttribute("path", req.path);
        span?.setAttribute("method", req.method);
        span?.setAttribute("ip", req.ip);
        span?.setAttribute("referer", req.headers.referer ?? "");

        res.on("close", () => {
          span?.setAttribute("statusCode", res.statusCode);
          span?.setAttribute(
            "statusFamily",
            Math.floor(res.statusCode / 100) * 100
          );
          // TODO: what to do tracing-wise if a request hangs?
          span?.end();
        });

        next();
      },
      { autoEndSpan: false }
    );
  };
}
