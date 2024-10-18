import { GPC_ARTIFACTS_NPM_VERSION } from "@pcd/gpc";

/**
 * Single constant shared between the service worker and the page code which
 * registers it.
 */
export const SERVICE_WORKER_ENABLED = process.env.NODE_ENV !== "development";

/** Start time of Devconnect 2023, from https://devconnect.org/schedule */
export const DEVCONNECT_2023_START = Date.parse(
  "November 13, 2023, 00:00:00 UTC+3"
);

/** End time of Devconnect 2023, from https://devconnect.org/schedule */
export const DEVCONNECT_2023_END = Date.parse(
  "November 20, 2023, 00:00:00 UTC+3"
);

export const ECD_2024_START = Date.parse("Feb 24, 2024, 00:00:00 UTC-7");

export const ECD_2024_END = Date.parse("March 4, 2024, 00:00:00 UTC-7");

export const OUTDATED_BROWSER_ERROR_MESSAGE =
  "SecurityError: The operation is insecure";

export const OOM_ERROR_MESSAGE = "Out of memory";

export const MAX_WIDTH_SCREEN = 420;

// Environment variable configure how we fetch GPC artifacts, however we
// default to fetching from the Zupass server rather than unpkg.
export const GPC_ARTIFACTS_CONFIG = 
    process.env.GPC_ARTIFACTS_CONFIG_OVERRIDE !== undefined &&
      process.env.GPC_ARTIFACTS_CONFIG_OVERRIDE !== ""
      ? process.env.GPC_ARTIFACTS_CONFIG_OVERRIDE
      : JSON.stringify({
          source: "zupass",
          stability: "prod",
          version: GPC_ARTIFACTS_NPM_VERSION
      });
