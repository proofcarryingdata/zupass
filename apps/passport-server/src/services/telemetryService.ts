import { HoneycombSDK } from "@honeycombio/opentelemetry-node";
import opentelemetry, { Span, Tracer } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import Libhoney from "libhoney";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

// todo get rid of these globals
let honeyClient: Libhoney | null;
let tracer: Tracer | null;

/**
 * Responsible for uploading telemetry data about the performance and usage
 * of the server to Honeycomb for analysis.
 */
export async function startTelemetry(
  context: ApplicationContext
): Promise<void> {
  if (!context.honeyClient) {
    logger(
      "[INIT] Not starting telemetry service - missing Honeycomb instance."
    );
    return;
  }

  honeyClient = context.honeyClient;
  tracer = opentelemetry.trace.getTracer("server-telemetry");

  const sdk: NodeSDK = new HoneycombSDK({
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: "server-telemetry"
  });

  logger("[INIT] Starting telemetry");

  return sdk
    .start()
    .then(() => {
      logger("[INIT] Tracing initialized");
    })
    .catch((error) => logger("Error initializing tracing", error));
}

/**
 * Runs the given function, and and creates traces in Honeycomb that are linked
 * to 'parent' and 'child' traces - other invocations of functions wrapped in
 * 'traced' that run inside of this one, or that this one is running inside of.
 *
 * In the case that the Honeycomb environment variables are not set up this function
 * just calls `func`.
 */
export async function traced<T>(
  service: string,
  method: string,
  func: (span?: Span) => Promise<T>,
  options?: {
    autoEndSpan?: boolean; // default true
  }
): Promise<T> {
  if (!honeyClient || !tracer) {
    return func();
  }

  return tracer.startActiveSpan(service + "." + method, async (span) => {
    if (process.env.ROLLBAR_ENV_NAME) {
      span.setAttribute("env_name", process.env.ROLLBAR_ENV_NAME);
    }
    try {
      const result = await func(span);
      if (
        options == null ||
        options.autoEndSpan == null ||
        options.autoEndSpan == true
      ) {
        span.end();
      }
      return result;
    } catch (e) {
      setError(e, span);
      span.end();
      throw e;
    }
  });
}

export function setError(e: Error | any, span?: Span): void {
  span?.setAttribute("error", true);
  span?.setAttribute("error_msg", e + "");

  if (e instanceof Error && e.stack) {
    span?.setAttribute("error_trace", e.stack);
  }
}
