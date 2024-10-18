import { RollbarService } from "@pcd/server-shared";
import { Application } from "express";
import * as http from "http";
import Libhoney from "libhoney";
import { Pool } from "postgres-pool";
import { IEmailAPI } from "./apis/emailAPI";
import { ILemonadeAPI } from "./apis/lemonade/lemonadeAPI";
import { IGenericPretixAPI } from "./apis/pretix/genericPretixAPI";
import { IZuzaluPretixAPI } from "./apis/zuzaluPretixAPI";
import {
  DevconnectPretixAPIFactory,
  DevconnectPretixSyncService
} from "./services/devconnectPretixSyncService";
import { DiscordService } from "./services/discordService";
import { E2EEService } from "./services/e2eeService";
import { EmailTokenService } from "./services/emailTokenService";
import { FrogcryptoService } from "./services/frogcryptoService";
import { GenericIssuanceService } from "./services/generic-issuance/GenericIssuanceService";
import { CredentialSubservice } from "./services/generic-issuance/subservices/CredentialSubservice";
import { IssuanceService } from "./services/issuanceService";
import { MetricsService } from "./services/metricsService";
import { MultiProcessService } from "./services/multiProcessService";
import { PagerDutyService } from "./services/pagerDutyService";
import { PersistentCacheService } from "./services/persistentCacheService";
import { PoapService } from "./services/poapService";
import { ProvingService } from "./services/provingService";
import { RateLimitService } from "./services/rateLimitService";
import { SemaphoreService } from "./services/semaphoreService";
import { TelegramService } from "./services/telegramService";
import { UserService } from "./services/userService";
import { ZuzaluPretixSyncService } from "./services/zuzaluPretixSyncService";

/**
 * The Zupass Server Express/NodeJS ap can run in one of three modes:
 *
 * - UNIFIED: The server is running as a single process, no clustering
 * - PARALLEL_MAIN: The server is running as the main process in a cluster.
 * - PARALLEL_CHILD: The server is running as a child process in a cluster.
 *
 * Either there is precisely one instance of the app running in UNIFIED mode,
 * or there are multiple instances of the app running, precisely one in
 * PARALLEL_MAIN mode, and one or more extra in PARALLEL_CHILD mode.
 */
export enum ServerMode {
  UNIFIED = "UNIFIED",
  PARALLEL_MAIN = "PARALLEL_MAIN",
  PARALLEL_CHILD = "PARALLEL_CHILD"
}

export interface ApplicationContext {
  dbPool: Pool;
  honeyClient: Libhoney | null;
  resourcesDir: string;
  publicResourcesDir: string;
  gitCommitHash: string;
  mode: ServerMode;
}

export interface GlobalServices {
  semaphoreService: SemaphoreService | null;
  userService: UserService;
  e2eeService: E2EEService;
  emailTokenService: EmailTokenService;
  rollbarService: RollbarService | null;
  provingService: ProvingService;
  zuzaluPretixSyncService: ZuzaluPretixSyncService | null;
  devconnectPretixSyncService: DevconnectPretixSyncService | null;
  metricsService: MetricsService | null;
  issuanceService: IssuanceService | null;
  discordService: DiscordService | null;
  telegramService: TelegramService | null;
  frogcryptoService: FrogcryptoService | null;
  poapService: PoapService;
  persistentCacheService: PersistentCacheService;
  multiprocessService: MultiProcessService;
  rateLimitService: RateLimitService;
  genericIssuanceService: GenericIssuanceService | null;
  pagerDutyService: PagerDutyService | null;
  credentialSubservice: CredentialSubservice;
}

export interface Zupass {
  context: ApplicationContext;
  services: GlobalServices;
  apis: APIs;
  expressContext: {
    app: Application;
    server: http.Server;
    localEndpoint: string;
  };
}

export interface APIs {
  emailAPI: IEmailAPI | null;
  zuzaluPretixAPI: IZuzaluPretixAPI | null;
  devconnectPretixAPIFactory: DevconnectPretixAPIFactory | null;
  lemonadeAPI: ILemonadeAPI | null;
  genericPretixAPI: IGenericPretixAPI | null;
}

export interface EnvironmentVariables {
  MAILGUN_API_KEY?: string;
  DATABASE_USERNAME?: string;
  DATABASE_PASSWORD?: string;
  DATABASE_HOST?: string;
  DATABASE_DB_NAME?: string;
  DATABASE_SSL?: string;
  BYPASS_EMAIL_REGISTRATION?: string;
  NODE_ENV?: string;
  HONEYCOMB_API_KEY?: string;
  PRETIX_TOKEN?: string;
  PRETIX_ORG_URL?: string;
  PRETIX_ZU_EVENT_ID?: string;
  PRETIX_VISITOR_EVENT_ID?: string;
  ROLLBAR_TOKEN?: string;
  SUPPRESS_LOGGING?: string;
  SERVER_EDDSA_PRIVATE_KEY?: string;
  TELEGRAM_BOT_TOKEN?: string;
  TELEGRAM_PRIVATE_CHAT_ID?: string;
  PASSPORT_CLIENT_URL?: string;
  ACCOUNT_RESET_RATE_LIMIT_DISABLED?: string;
  TICKET_ISSUANCE_CUTOFF_DATE?: string;
  GENERIC_RATE_LIMIT_DISABLED?: string;
  GENERIC_ISSUANCE_ZUPASS_PUBLIC_KEY?: string;
  PASSPORT_SERVER_URL: string;
  STYTCH_BYPASS?: string;
}
