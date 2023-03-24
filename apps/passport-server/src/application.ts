import {
  ProveRequest,
  ProveResponse,
  StampStatus,
} from "@pcd/passport-interface";
import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getDBClient } from "./database/postgresClient";
import { startServer } from "./routing/server";
import { startMetrics } from "./services/metrics";
import { startPretixSync } from "./services/pretixSync";
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
  const dbClient = await getDBClient();
  const honeyClient = getHoneycombAPI();
  const queue: Array<ProveRequest> = [];
  const stampStatus: Map<string, StampStatus> = new Map();
  const stampResult: Map<string, ProveResponse> = new Map();

  const context: ApplicationContext = {
    dbClient,
    honeyClient,
    queue,
    stampStatus,
    stampResult,
  };

  // Run all services concurrently.
  for (const service of services) {
    service(context);
  }
}
