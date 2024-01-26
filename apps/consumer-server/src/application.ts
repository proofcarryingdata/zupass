import { startServer } from "./routing/server";
import { ServiceInitializer } from "./services/types";
import { ApplicationContext } from "./types";

const services: ServiceInitializer[] = [startServer];

export async function startApplication(): Promise<void> {
  const context: ApplicationContext = {};

  for (const service of services) {
    await service(context);
  }
}
