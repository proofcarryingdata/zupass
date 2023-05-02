import { HoneycombSDK } from "@honeycombio/opentelemetry-node";
import opentelemetry, { Span, Tracer } from "@opentelemetry/api";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import Libhoney from "libhoney";
import { ApplicationContext } from "../types";

let honeyClient: Libhoney | null;
let tracer: Tracer | null;

export function startTelemetry(context: ApplicationContext): void {
  if (!context.honeyClient) {
    console.log(
      "[INIT] Not starting telemetry service - missing Honeycomb instance."
    );
    return;
  }

  honeyClient = context.honeyClient;
  tracer = opentelemetry.trace.getTracer("passport-server");

  const sdk: NodeSDK = new HoneycombSDK({
    instrumentations: [getNodeAutoInstrumentations()],
  });

  console.log("[INIT] Starting telemetry");

  sdk
    .start()
    .then(() => {
      console.log("[INIT] Tracing initialized");
    })
    .catch((error) => console.log("Error initializing tracing", error));
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
  func: (span?: Span) => Promise<T>
): Promise<T> {
  if (!honeyClient || !tracer) {
    return func();
  }

  return tracer.startActiveSpan(service + "." + method, async (span) => {
    console.log("ACTIVE SPAN START");
    const result = await func(span);
    span.end();
    console.log("ACTIVE SPAN END");
    return result;
  });
}
