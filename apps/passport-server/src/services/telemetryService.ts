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
let commitHash: string;

export const DATASET_SLUG = "server-telemetry";

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
  commitHash = context.gitCommitHash;

  const sdk: NodeSDK = new HoneycombSDK({
    instrumentations: [getNodeAutoInstrumentations()],
    serviceName: DATASET_SLUG
  });

  logger("[INIT] Starting telemetry");

  return sdk
    .start()
    .then(() => {
      logger("[INIT] Tracing initialized");
      writeMarker(
        context.gitCommitHash,
        MarkerType.Deploy,
        `https://github.com/proofcarryingdata/zupass/commit/${context.gitCommitHash}`
      );
    })
    .catch((error) => logger("Error initializing tracing", error));
}

export const enum MarkerType {
  Deploy = "deploy"
}

export async function writeMarker(
  name: string,
  type: string,
  url?: string
): Promise<void> {
  if (!honeyClient) {
    logger("can't write a marker to honeycomb - missing API keys");
    return;
  }

  try {
    await fetch(honeyClient.apiHost + `1/markers/${DATASET_SLUG}`, {
      method: "POST",
      body: JSON.stringify({
        message: name,
        type,
        url
      }),
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        "X-Honeycomb-Team": honeyClient.writeKey
      }
    });
  } catch (e) {
    logger("failed to write marker to honeycomb", e);
  }
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

    span.setAttribute("commit_hash", commitHash);

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
