import { sqlQuery } from "../../src/database/sqlQuery";
import { Zupass } from "../../src/types";

export async function resetRateLimits(application: Zupass): Promise<void> {
  await sqlQuery(application.context.dbPool, "DELETE FROM rate_limit_buckets");
  application.services.rateLimitService.stop();
  await application.services.rateLimitService.start();
}
