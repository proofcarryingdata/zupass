import { startDevconnectPretixSyncService } from "./services/devconnectPretixSyncService";
import { startDiscordService } from "./services/discordService";
import { startE2EEService } from "./services/e2eeService";
import { startEmailService } from "./services/emailService";
import { startEmailTokenService } from "./services/emailTokenService";
import { startFrogcryptoService } from "./services/frogcryptoService";
import { startGenericIssuanceService } from "./services/generic-issuance/GenericIssuanceService";
import { startIssuanceService } from "./services/issuanceService";
import { startKudosbotService } from "./services/kudosbotService";
import { startMetricsService } from "./services/metricsService";
import { startMultiProcessService } from "./services/multiProcessService";
import { startPagerDutyService } from "./services/pagerDutyService";
import { startPersistentCacheService } from "./services/persistentCacheService";
import { startPoapService } from "./services/poapService";
import { startProvingService } from "./services/provingService";
import { startRateLimitService } from "./services/rateLimitService";
import { startRollbarService } from "./services/rollbarService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startTelegramService } from "./services/telegramService";
import { startTelemetry } from "./services/telemetryService";
import { startUserService } from "./services/userService";
import { startZuconnectTripshaSyncService } from "./services/zuconnectTripshaSyncService";
import { startZuzaluPretixSyncService } from "./services/zuzaluPretixSyncService";
import { APIs, ApplicationContext, GlobalServices } from "./types";
import { instrumentPCDs } from "./util/instrumentPCDs";

export async function startServices(
  context: ApplicationContext,
  apis: APIs
): Promise<GlobalServices> {
  await startTelemetry(context);
  instrumentPCDs();

  const multiprocessService = startMultiProcessService();
  const pagerDutyService = startPagerDutyService();
  const discordService = await startDiscordService();
  const rollbarService = startRollbarService(context);
  const rateLimitService = startRateLimitService(context, rollbarService);
  const telegramService = await startTelegramService(
    context,
    rollbarService,
    discordService
  );
  const kudosbotService = await startKudosbotService(context, rollbarService);
  const provingService = await startProvingService(rollbarService);
  const emailService = startEmailService(context, apis.emailAPI);
  const emailTokenService = startEmailTokenService(context);
  const semaphoreService = startSemaphoreService(context);
  const zuzaluPretixSyncService = startZuzaluPretixSyncService(
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
  const zuconnectTripshaSyncService = await startZuconnectTripshaSyncService(
    context,
    rollbarService,
    semaphoreService,
    apis.zuconnectTripshaAPI
  );
  const userService = startUserService(
    context,
    semaphoreService,
    emailTokenService,
    emailService,
    rateLimitService
  );
  const e2eeService = startE2EEService(context);
  const metricsService = startMetricsService(context, rollbarService);
  const persistentCacheService = startPersistentCacheService(
    context.dbPool,
    rollbarService
  );
  const issuanceService = await startIssuanceService(
    context,
    persistentCacheService,
    rollbarService,
    multiprocessService
  );
  const frogcryptoService = await startFrogcryptoService(
    context,
    rollbarService,
    issuanceService
  );
  const poapService = startPoapService(context, rollbarService);
  const genericIssuanceService = await startGenericIssuanceService(
    context,
    rollbarService,
    apis.lemonadeAPI,
    apis.genericPretixAPI,
    pagerDutyService,
    discordService,
    persistentCacheService
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
    zuconnectTripshaSyncService,
    metricsService,
    issuanceService,
    discordService,
    telegramService,
    kudosbotService,
    frogcryptoService,
    poapService,
    persistentCacheService,
    multiprocessService,
    rateLimitService,
    genericIssuanceService,
    pagerDutyService
  };

  return services;
}

export async function stopServices(services: GlobalServices): Promise<void> {
  services.provingService.stop();
  services.semaphoreService.stop();
  services.zuzaluPretixSyncService?.stop();
  services.metricsService.stop();
  services.telegramService?.stop();
  services.kudosbotService?.stop();
  services.persistentCacheService.stop();
  services.devconnectPretixSyncService?.stop();
  services.zuconnectTripshaSyncService?.stop();
  services.frogcryptoService?.stop();
  await services.discordService?.stop();
  await services.multiprocessService.stop();
  services.rateLimitService?.stop();
  services.genericIssuanceService?.stop();
}
