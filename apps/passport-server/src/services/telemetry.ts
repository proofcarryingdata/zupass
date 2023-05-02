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

export async function teleTrace<T>(
  service: string,
  method: string,
  func: (span?: Span) => Promise<T>
): Promise<T> {
  if (!honeyClient) {
    return func();
  }

  return tracer!.startActiveSpan(service + "." + method, async (span) => {
    console.log("ACTIVE SPAN START");
    const result = await func(span);
    span.end();
    console.log("ACTIVE SPAN END");
    return result;
  });
}
