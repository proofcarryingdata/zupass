/// <reference path="../util/declarations/libhoney.d.ts" />
import Libhoney from "libhoney";
import { ApplicationContext } from "../types";
import { IS_PROD } from "../util/isProd";

function getDatasetName() {
  const prefix = "zk-faucet";

  if (IS_PROD) {
    return prefix + "-prod";
  }

  return prefix + "-dev";
}

export function getHoneycombAPI(): Libhoney | null {
  console.log("[INIT] Loaded a Honeycomb API");
  if (process.env.HONEYCOMB_API_KEY === undefined) {
    return null;
  }

  return new Libhoney({
    writeKey: process.env.HONEYCOMB_API_KEY,
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
