import { NextFunction, Request, Response } from "express";
import { traced } from "../../services/telemetry";

export function tracingMiddleware() {
  console.log("[TRACING] setting up middleware");
  return (req: Request, res: Response, next: NextFunction) => {
    console.log("[TRACING] handling request");
    traced(
      "Express",
      "request",
      async (span) => {
        span?.setAttribute("url", req.originalUrl);
        span?.setAttribute("method", req.method);
        span?.setAttribute("ip", req.ip);

        res.on("close", () => {
          span?.end();
        });

        next();
      },
      { autoEndSpan: false }
    );
  };
}
