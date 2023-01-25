import { getHoneycombAPI } from "./apis/honeycombAPI";
import { getDBClient } from "./database/postgresClient";
import { startServer } from "./routing/server";
import { startMetrics } from "./services/metrics";
import { ApplicationContext } from "./types";

export async function startApplication() {
  const dbClient = await getDBClient();
  const honeyClient = await getHoneycombAPI();

  const context: ApplicationContext = {
    dbClient,
    honeyClient,
  };

  startMetrics(context);
  startServer(context);
}
