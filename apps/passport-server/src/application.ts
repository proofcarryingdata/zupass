import { ProveRequest, StampStatus } from "@pcd/passport-interface";
import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getDB } from "./database/postgresPool";
import { startServer } from "./routing/server";
import { startMetrics } from "./services/metrics";
import { startPretixSync } from "./services/pretixSync";
import { getRollbar } from "./services/rollbar";
import { startSemaphoreService } from "./services/semaphore";
import { startTelemetry } from "./services/telemetry";
import { ServiceInitializer } from "./services/types";
import { ApplicationContext } from "./types";

const services: ServiceInitializer[] = [
  startTelemetry,
  startMetrics,
  startServer,
  startPretixSync,
  startSemaphoreService,
];

export async function startApplication() {
  const dbPool = await getDB();
  const honeyClient = getHoneycombAPI();
  const rollbar = getRollbar();
  const queue: Array<ProveRequest> = [];
  const stampStatus: Map<string, StampStatus> = new Map();

  const context: ApplicationContext = {
    dbPool,
    honeyClient,
    rollbar,
    queue,
    stampStatus,
  };

  // Run all services concurrently.
  for (const service of services) {
    service(context);
  }
}
