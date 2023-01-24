import { HoneycombSDK } from "@honeycombio/opentelemetry-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";

export async function getHoneycomb(): Promise<HoneycombSDK | null> {
  console.log("[HONEYCOMB] Attempting to start");

  if (process.env.HONEYCOMB_API_KEY === undefined) {
    console.log(
      "[HONEYCOMB] Not starting 0 missing environment variable HONEYCOMB_API_KEY"
    );
    return null;
  }

  if (process.env.OTEL_SERVICE_NAME === undefined) {
    console.log(
      "[HONEYCOMB] Not starting - missing environment variable OTEL_SERVICE_NAME"
    );
    return null;
  }

  // uses the HONEYCOMB_API_KEY and OTEL_SERVICE_NAME environment variables
  const sdk = new HoneycombSDK({
    instrumentations: [new HttpInstrumentation(), new ExpressInstrumentation()],
  });

  await sdk.start();

  console.log("[HONEYCOMB] Started");

  return sdk;
}
