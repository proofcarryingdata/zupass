import { ApplicationContext } from "../types";
import { githubRateLimitMetric } from "./metrics/githubRateLimitMetric";
import { Metric } from "./types";

const metrics: Metric[] = [githubRateLimitMetric];

export async function startMetrics(context: ApplicationContext) {
  console.log("[INIT] Starting metrics");

  for (const metric of metrics) {
    metric(context);
  }
}
