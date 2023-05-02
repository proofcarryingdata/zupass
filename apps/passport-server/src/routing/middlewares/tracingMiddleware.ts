import { NextFunction, Request, Response } from "express";
import { traced } from "../../services/telemetry";

/**
 * Express middleware that traces all HTTP requests to HoneyComb. This
 * makes it possible to inspect the performance characteristics of all
 * HTTP requests.
 */
export function tracingMiddleware() {
  console.log("[TRACING] setting up middleware");
  return (req: Request, res: Response, next: NextFunction) => {
    console.log("[TRACING] handling request");
    traced(
      "Express",
      "request",
      async (span) => {
        span?.setAttribute("url", req.originalUrl);
        span?.setAttribute("path", req.path);
        span?.setAttribute("method", req.method);
        span?.setAttribute("ip", req.ip);

        res.on("close", () => {
          span?.setAttribute("statusCode", res.statusCode);
          // TODO: what to do tracing-wise if a request hangs?
          span?.end();
        });

        next();
      },
      { autoEndSpan: false }
    );
  };
}
