/// <reference path="../util/declarations/libhoney.d.ts" />
import Libhoney from "libhoney";
import { ApplicationContext } from "../types";
import { IS_PROD } from "../util/isProd";
import { requireEnv } from "../util/util";

function getDatasetName() {
  const prefix = "zk-faucet";

  if (IS_PROD) {
    return prefix + "-prod";
  }

  return prefix + "-dev";
}

export function getHoneycombAPI(): Libhoney | null {
  try {
    requireEnv("HONEYCOMB_API_KEY");
    requireEnv("OTEL_SERVICE_NAME");
  } catch (e) {
    console.log(
      `[INIT] Missing environment variable ${e} - skipping starting Honeycomb API`
    );
    return null;
  }

  console.log("[INIT] Loaded a Honeycomb API");

  return new Libhoney({
    writeKey: process.env.HONEYCOMB_API_KEY!,
    dataset: getDatasetName(),
  });
}

export enum EventName {
  SERVER_START = "SERVER_START",
  METRIC = "METRIC",
}

export function sendEvent(
  context: ApplicationContext,
  eventName: EventName,
  eventData?: any
) {
  if (!context.honeyClient) return;

  const event = context.honeyClient.newEvent();
  if (eventData) {
    event.add(eventData);
  }
  event.addField("event_name", eventName);
  event.send();
}
