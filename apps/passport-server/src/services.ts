import { startDevconnectPretixSyncService } from "./services/devconnectPretixSyncService";
import { startDiscordService } from "./services/discordService";
import { startE2EEService } from "./services/e2eeService";
import { startEmailService } from "./services/emailService";
import { startEmailTokenService } from "./services/emailTokenService";
import { startFrogcryptoService } from "./services/frogcryptoService";
import { startCredentialSubservice } from "./services/generic-issuance/subservices/CredentialSubservice";
import { startGenericIssuanceService } from "./services/generic-issuance/subservices/utils/startGenericIssuanceService";
import { startIssuanceService } from "./services/issuanceService";
import { startLocalFileService } from "./services/LocalFileService";
import { startMetricsService } from "./services/metricsService";
import { startMultiProcessService } from "./services/multiProcessService";
import { startPagerDutyService } from "./services/pagerDutyService";
import { startPersistentCacheService } from "./services/persistentCacheService";
import { startPoapService } from "./services/poapService";
import { startProvingService } from "./services/provingService";
import { startRateLimitService } from "./services/rateLimitService";
import { startSemaphoreService } from "./services/semaphoreService";
import { startRollbarService } from "./services/startRollbarService";
import { startTelegramService } from "./services/telegramService";
import { startTelemetry } from "./services/telemetryService";
import { startUserService } from "./services/userService";
import { startZuzaluPretixSyncService } from "./services/zuzaluPretixSyncService";
import { APIs, ApplicationContext, GlobalServices } from "./types";

export async function startServices(
  context: ApplicationContext,
  apis: APIs
): Promise<GlobalServices> {
  await startTelemetry(context);

  const multiprocessService = startMultiProcessService();
  const pagerDutyService = startPagerDutyService();
  const discordService = await startDiscordService(context);
  const rollbarService = startRollbarService(context);
  const rateLimitService = startRateLimitService(context, rollbarService);
  const telegramService = await startTelegramService(
    context,
    rollbarService,
    discordService
  );
  const credentialSubservice = await startCredentialSubservice(
    context.dbPool,
    multiprocessService
  );
  const provingService = await startProvingService(rollbarService);
  const emailService = startEmailService(context, apis.emailAPI);
  const emailTokenService = startEmailTokenService();
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

  const e2eeService = startE2EEService(credentialSubservice);
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
  const localFileService = startLocalFileService();
  const genericIssuanceService = await startGenericIssuanceService(
    context,
    rollbarService,
    apis.lemonadeAPI,
    apis.genericPretixAPI,
    pagerDutyService,
    discordService,
    persistentCacheService,
    emailService,
    credentialSubservice,
    localFileService
  );
  const userService = startUserService(
    context,
    emailTokenService,
    emailService,
    rateLimitService,
    genericIssuanceService,
    credentialSubservice
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
    frogcryptoService,
    poapService,
    persistentCacheService,
    multiprocessService,
    rateLimitService,
    genericIssuanceService,
    pagerDutyService,
    credentialSubservice,
    localFileService
  };

  return services;
}

export async function stopServices(services: GlobalServices): Promise<void> {
  services.userService?.stop();
  services.provingService?.stop();
  services.semaphoreService?.stop();
  services.zuzaluPretixSyncService?.stop();
  services.metricsService?.stop();
  services.telegramService?.stop();
  services.persistentCacheService.stop();
  services.devconnectPretixSyncService?.stop();
  services.frogcryptoService?.stop();
  await services.discordService?.stop();
  await services.multiprocessService.stop();
  services.rateLimitService?.stop();
  services.genericIssuanceService?.stop();
}
