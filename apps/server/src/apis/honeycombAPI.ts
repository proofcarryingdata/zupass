/// <reference path="../util/declarations/libhoney.d.ts" />
import Libhoney from "libhoney";
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
