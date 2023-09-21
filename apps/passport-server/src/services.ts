import { startDevconnectPretixSyncService } from "./services/devconnectPretixSyncService";
import { startDiscordService } from "./services/discordService";
import { startE2EEService } from "./services/e2eeService";
import { startEmailService } from "./services/emailService";
import { startEmailTokenService } from "./services/emailTokenService";
import { startIssuanceService } from "./services/issuanceService";
import { startMetricsService } from "./services/metricsService";
import { startPersistentCacheService } from "./services/persistentCacheService";
import { startPretixSyncService } from "./services/pretixSyncService";
import { startProvingService } from "./services/provingService";
import { startRollbarService } from "./services/rollbarService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startTelegramService } from "./services/telegramService";
import { startTelemetry } from "./services/telemetryService";
import { startUserService } from "./services/userService";
import { APIs, ApplicationContext, GlobalServices } from "./types";

export async function startServices(
  context: ApplicationContext,
  apis: APIs
): Promise<GlobalServices> {
  await startTelemetry(context);
  const discordService = await startDiscordService();
  const rollbarService = startRollbarService(context);
  const telegramService = await startTelegramService(context, rollbarService);
  const provingService = await startProvingService(rollbarService);
  const emailService = startEmailService(
    context,
    rollbarService,
    apis.emailAPI
  );
  const emailTokenService = startEmailTokenService(context);
  const semaphoreService = startSemaphoreService(context);
  const zuzaluPretixSyncService = startPretixSyncService(
    context,
    rollbarService,
    semaphoreService,
    apis.zuzaluPretixAPI
  );
  const devconnectPretixSyncService = await startDevconnectPretixSyncService(
    context,
    rollbarService,
    semaphoreService,
    apis.devconnectPretixAPIFactory
  );
  const userService = startUserService(
    context,
    semaphoreService,
    emailTokenService,
    emailService,
    rollbarService
  );
  const e2eeService = startE2EEService(context, rollbarService);
  const metricsService = startMetricsService(context, rollbarService);
  const persistentCacheService = startPersistentCacheService(
    context.dbPool,
    rollbarService
  );
  const issuanceService = startIssuanceService(
    context,
    persistentCacheService,
    rollbarService
  );
  const services: GlobalServices = {
    semaphoreService,
    userService,
    e2eeService,
    emailTokenService,
    rollbarService,
    provingService,
    zuzaluPretixSyncService,
    devconnectPretixSyncService,
    metricsService,
    issuanceService,
    discordService,
    telegramService,
    persistentCacheService
  };
  return services;
}

export async function stopServices(services: GlobalServices): Promise<void> {
  services.provingService.stop();
  services.semaphoreService.stop();
  services.zuzaluPretixSyncService?.stop();
  services.metricsService.stop();
  services.telegramService?.stop();
  services.persistentCacheService.stop();
  services.devconnectPretixSyncService?.stop();
  await services.discordService?.stop();
}
