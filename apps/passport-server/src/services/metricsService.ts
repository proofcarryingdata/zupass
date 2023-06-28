import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { Metric } from "./types";

const metrics: Metric[] = [];

/**
 * Responsible for uploading metrics. Currently unused.
 */
export function startMetrics(context: ApplicationContext) {
  logger("[INIT] Starting metrics");

  for (const metric of metrics) {
    metric(context);
  }
}
