import { HoneycombSDK } from "@honeycombio/opentelemetry-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { IS_PROD } from "../isProd";

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

  const config = {
    apiKey: process.env.HONEYCOMB_API_KEY,
    serviceName: process.env.OTEL_SERVICE_NAME,
    debug: true,
    instrumentations: [getNodeAutoInstrumentations()],
    metricsDataset:
      process.env.HONEYCOMB_METRICS_DATASET ||
      "zk-webserver-" + (IS_PROD ? "prod" : "dev"),
    // add app level attributes to appear on every span
    // resource: new Resource({
    //   'global.build_id': process.env.APP_BUILD_ID,
    // }),
  };

  const sdk = new HoneycombSDK(config);

  await sdk.start();

  console.log("[HONEYCOMB] Started");

  return sdk;
}
