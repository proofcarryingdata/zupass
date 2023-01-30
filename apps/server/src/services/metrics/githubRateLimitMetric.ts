import { getAPIRateLimit, initOctokit } from "../../apis/githubAPI";
import { EventName, sendEvent } from "../../apis/honeycombAPI";
import { ApplicationContext } from "../../types";
import { MetricName } from "../types";

export function githubRateLimitMetric(context: ApplicationContext) {
  console.log("[INIT] Starting github rate limit metric");
  const octokit = initOctokit();

  const collect = async () => {
    try {
      const rateLimit = await getAPIRateLimit(octokit);
      console.log("[GITHUB] rate limit stats: ", rateLimit);
      sendEvent(context, EventName.METRIC, {
        metric_name: MetricName.GITHUB_RATE_LIMIT,
        ...rateLimit,
      });
    } catch (e) {}
  };

  collect();
  setInterval(collect, 1000 * 60);
}
