import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getDBClient } from "./database/postgresClient";
import { startServer } from "./routing/server";
import { startMetrics } from "./services/metrics";
import { ServiceInitializer } from "./services/types";
import { ApplicationContext } from "./types";

const services: ServiceInitializer[] = [startMetrics, startServer];

export async function startApplication() {
  const dbClient = await getDBClient();
  const honeyClient = await getHoneycombAPI();

  const context: ApplicationContext = {
    dbClient,
    honeyClient,
  };

  for (const service of services) {
    await service(context);
  }
}
