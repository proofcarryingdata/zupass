import { RollbarService } from "@pcd/server-shared";
import { getCacheSize } from "../database/queries/cache";
import { fetchE2EEStorageCount } from "../database/queries/e2ee";
import { fetchUserCount } from "../database/queries/users";
import { namedSqlTransaction } from "../database/sqlQuery";
import { ApplicationContext, ServerMode } from "../types";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

interface Metrics {
  usersCount: number;
  e2eeCount: number;
  cacheSize: number;
}

export class MetricsService {
  private static readonly COLLECTION_INTERVAL_MS = 1000 * 60;
  private timeout: NodeJS.Timeout | undefined;
  private rollbarService: RollbarService | null;
  private context: ApplicationContext;

  public constructor(
    context: ApplicationContext,
    rollbarService: RollbarService | null
  ) {
    this.context = context;
    this.rollbarService = rollbarService;
  }

  public async start(): Promise<void> {
    await this.collectAndReportMetrics();
    this.timeout = setTimeout(
      () => this.start(),
      MetricsService.COLLECTION_INTERVAL_MS
    );
  }

  public stop(): void {
    if (this.timeout) {
      clearTimeout(this.timeout);
    }
  }

  private async collectAndReportMetrics(): Promise<void> {
    try {
      logger("[METRICS] collecting metrics");
      const metrics = await this.collectMetrics();
      logger("[METRICS] collected metrics", metrics);
      await this.reportMetrics(metrics);
    } catch (e) {
      logger("[METRICS] error", e);
      this.rollbarService?.reportError(e);
    }
  }

  private async collectMetrics(): Promise<Metrics> {
    return await namedSqlTransaction(
      this.context.dbPool,
      "collectMetrics",
      async (client) => {
        const metrics: Metrics = {
          usersCount: await fetchUserCount(client),
          e2eeCount: await fetchE2EEStorageCount(client),
          cacheSize: await getCacheSize(client)
        };

        return metrics;
      }
    );
  }

  private async reportMetrics(metrics: Metrics): Promise<void> {
    traced("Metrics", "reportMetrics", async (span) => {
      if (!span) {
        logger("[METRICS] couldn't report metrics - missing honeycomb client");
        return;
      } else {
        logger("[METRICS] reporting metrics");
      }

      for (const [metricName, metricValue] of Object.entries(metrics)) {
        span.setAttribute(metricName, metricValue);
      }
    });
  }
}

/**
 * Responsible for collecting and uploading metrics.
 */
export function startMetricsService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): MetricsService | null {
  if (![ServerMode.UNIFIED, ServerMode.PARALLEL_MAIN].includes(context.mode)) {
    logger(
      `[INIT] metrics service not started, not in unified or parallel main mode`
    );
    return null;
  }

  if (process.env.DISABLE_JOBS === "true") {
    logger("[INIT] generic issuance service not starting because DISABLE_JOBS");
    return null;
  }

  logger("[INIT] Starting metrics");
  const metricsService = new MetricsService(context, rollbarService);
  metricsService.start();
  return metricsService;
}
