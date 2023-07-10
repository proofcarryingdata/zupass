import { startE2EEService } from "./services/e2eeService";
import { startEmailService } from "./services/emailService";
import { startEmailTokenService } from "./services/emailTokenService";
import { startMetricsService } from "./services/metricsService";
import { startPretixSyncService } from "./services/pretixSyncService";
import { startProvingService } from "./services/provingService";
import { startRollbarService } from "./services/rollbarService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startTelemetry } from "./services/telemetryService";
import { startUserService } from "./services/userService";
import { APIs, ApplicationContext, GlobalServices } from "./types";

export async function startServices(
  context: ApplicationContext,
  apis: APIs
): Promise<GlobalServices> {
  const rollbarService = startRollbarService();
  await startTelemetry(context);
  const provingService = await startProvingService(rollbarService);
  const emailService = startEmailService(
    context,
    rollbarService,
    apis.emailAPI
  );
  const emailTokenService = startEmailTokenService(context);
  const semaphoreService = startSemaphoreService(context);
  const pretixSyncService = startPretixSyncService(
    context,
    rollbarService,
    semaphoreService,
    apis.pretixAPI
  );
  const userService = startUserService(
    context,
    semaphoreService,
    emailTokenService,
    emailService,
    rollbarService
  );
  const e2eeService = startE2EEService(context, rollbarService);
  const metricsService = await startMetricsService(context, rollbarService);
  const services: GlobalServices = {
    semaphoreService,
    userService,
    e2eeService,
    emailTokenService,
    rollbarService,
    provingService,
    pretixSyncService,
    metricsService,
  };
  return services;
}

export async function stopServices(services: GlobalServices): Promise<void> {
  services.provingService.stop();
  services.semaphoreService.stop();
  services.pretixSyncService?.stop();
}
