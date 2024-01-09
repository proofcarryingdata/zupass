import { HoneycombSDK } from "@honeycombio/opentelemetry-node";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { NodeSDK } from "@opentelemetry/sdk-node";
import { ApplicationContext } from "../types";

export function startTelemetry(_context: ApplicationContext) {
  const sdk: NodeSDK = new HoneycombSDK({
    instrumentations: [getNodeAutoInstrumentations()]
  });

  console.log("[INIT] Starting telemetry");

  sdk
    .start()
    .then(() => {
      console.log("[INIT] Tracing initialized");
    })
    .catch((error) => console.log("Error initializing tracing", error));
}
