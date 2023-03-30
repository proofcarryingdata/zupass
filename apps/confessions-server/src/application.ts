import { getDB } from "./database/postgresPool";
import { startServer } from "./routing/server";
import { ServiceInitializer } from "./services/types";
import { ApplicationContext } from "./types";

const services: ServiceInitializer[] = [startServer];

export async function startApplication() {
  const dbPool = await getDB();

  const context: ApplicationContext = {
    dbPool,
  };

  for (const service of services) {
    await service(context);
  }
}
