// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="../util/declarations/libhoney.d.ts" />
import { requireEnv } from "@pcd/server-shared";
import Libhoney from "libhoney";
import { ApplicationContext } from "../types";
import { logger } from "../util/logger";

export function getHoneycombAPI(): Libhoney | null {
  try {
    const honeycombApiKey = requireEnv("HONEYCOMB_API_KEY");

    const api = new Libhoney({
      writeKey: honeycombApiKey,
      dataset: "server-telemetry"
    });

    logger("[INIT] Loaded a Honeycomb API");

    return api;
  } catch (e) {
    logger(
      `[INIT] Missing environment variable ${e} - skipping starting Honeycomb API`
    );
    return null;
  }
}

export enum EventName {
  SERVER_START = "SERVER_START",
  METRIC = "METRIC"
}

export function sendEvent(
  context: ApplicationContext,
  eventName: EventName,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  eventData?: any
): void {
  if (!context.honeyClient) return;

  const event = context.honeyClient.newEvent();
  if (eventData) {
    event.add(eventData);
  }
  event.addField("event_name", eventName);
  event.send();
}
