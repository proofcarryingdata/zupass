import { startServer } from "./routing/server";
import { ServiceInitializer } from "./services/types";
import { ApplicationContext } from "./types";

const services: ServiceInitializer[] = [startServer];

export async function startApplication(): Promise<void> {
  const context: ApplicationContext = {
    ironOptions: {
      ttl: 1209600, // Expiry: 14 days.
      cookieName: "consumer_app_cookie",
      // eslint-disable-next-line turbo/no-undeclared-env-vars
      password: process.env.IRON_SESSION_PASSWORD as string,
      cookieOptions: {
        secure: process.env.NODE_ENV === "production"
      }
    }
  };

  for (const service of services) {
    await service(context);
  }
}
