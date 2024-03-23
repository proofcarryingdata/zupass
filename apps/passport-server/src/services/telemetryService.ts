import { HoneycombSDK } from "@honeycombio/opentelemetry-node";
import opentelemetry, { Span, Tracer } from "@opentelemetry/api";
import { getActiveSpan } from "@opentelemetry/api/build/src/trace/context-utils";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ZUPASS_GITHUB_REPOSITORY_URL, flattenObject } from "@pcd/util";
import Libhoney from "libhoney";
import urljoin from "url-join";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { getCommitMessage } from "../util/util";

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

  try {
    await sdk.start();
    logger("[INIT] Tracing initialized");
    const commitMsgPreview = (await getCommitMessage()).slice(0, 20);
    writeMarker(
      commitMsgPreview,
      MarkerType.Deploy,
      urljoin(ZUPASS_GITHUB_REPOSITORY_URL, "commit", context.gitCommitHash)
    );
  } catch (error) {
    logger("Error initializing tracing", error);
  }
}

export const enum MarkerType {
  Deploy = "deploy"
}

export interface HoneyAuthCtx {
  envSlug: string;
  teamSlug: string;
}

let cachedCtx: HoneyAuthCtx | undefined = undefined;

export async function getHoneyAuthCtx(): Promise<HoneyAuthCtx> {
  if (!honeyClient?.apiHost) {
    throw new Error("missing honeycomb client");
  }

  if (cachedCtx) {
    return cachedCtx;
  }

  // eslint-disable-next-line no-restricted-globals
  const res = await fetch("https://api.honeycomb.io/1/auth", {
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Honeycomb-Team": honeyClient.writeKey
    }
  });

  const result = await res.json();

  if (!result?.environment?.slug) {
    throw new Error("expected to be able to get environment slug");
  }

  if (!result?.team?.slug) {
    throw new Error("expected to be able to get team slug");
  }

  cachedCtx = {
    envSlug: result?.environment?.slug,
    teamSlug: result?.team?.slug
  };
  return cachedCtx;
}

export async function createQueryUrl(query: object): Promise<string> {
  if (!honeyClient?.apiHost) {
    throw new Error("missing honeycomb client");
  }

  if (!query) {
    throw new Error("missing query");
  }

  const authEnv = await getHoneyAuthCtx();
  const encodedQueryDefinition = encodeURIComponent(JSON.stringify(query));
  const queryURL =
    `https://ui.honeycomb.io/${authEnv.teamSlug}/environments/` +
    `${authEnv.envSlug}/datasets/${DATASET_SLUG}` +
    `?query=${encodedQueryDefinition}`;

  return queryURL;
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
    // eslint-disable-next-line no-restricted-globals
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
    span.setAttribute("trace_service_name", service);
    span.setAttribute("trace_method_name", method);

    if (process.env.ROLLBAR_ENV_NAME) {
      span.setAttribute("env_name", process.env.ROLLBAR_ENV_NAME);
    }

    span.setAttribute("commit_hash", commitHash);

    try {
      const result = await func(span);
      if (
        !options ||
        options.autoEndSpan === undefined ||
        options.autoEndSpan === true
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

export function setError(e: unknown, span?: Span): void {
  span = span ?? getActiveSpan();
  span?.setAttribute("error", true);
  span?.setAttribute("error_msg", e + "");

  if (e instanceof Error && e.stack) {
    span?.setAttribute("error_trace", e.stack);

    if (e.cause instanceof Error && e.cause.stack) {
      span?.setAttribute("error_cause", e.cause.message);
      span?.setAttribute("error_cause_stack", e.cause.stack);
    }
  }
}

export function traceFlattenedObject(
  span: Span | undefined,
  val: object | undefined
): void {
  const flattened = flattenObject(val);
  flattened.forEach(([k, v]) => {
    span?.setAttribute(k, v);
  });
}
