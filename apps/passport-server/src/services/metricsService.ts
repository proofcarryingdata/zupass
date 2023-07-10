import { ApplicationContext } from "../types";
import { logger } from "../util/logger";
import { RollbarService } from "./rollbarService";

interface Metrics {}

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
    const metrics = await this.collectMetrics();

    this.reportMetrics(metrics).catch((e) => {
      logger("[METRICS] error reporting metrics");
    });
  }

  private async collectMetrics(): Promise<Metrics> {
    const metrics: Metrics = {};
    return metrics;
  }

  private async reportMetrics(metrics: Metrics): Promise<void> {}
}

/**
 * Responsible for uploading metrics. Currently unused.
 */
export async function startMetricsService(
  context: ApplicationContext,
  rollbarService: RollbarService | null
): Promise<MetricsService> {
  logger("[INIT] Starting metrics");
  const metricsService = new MetricsService(context, rollbarService);
  metricsService.start();
  return metricsService;
}
