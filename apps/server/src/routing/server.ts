import express from "express";
import morgan from "morgan";
import { ApplicationContext } from "../types";
import { IS_PROD } from "../util/isProd";
import { initControlRoutes } from "./routes/controlRoutes";
import { initDataRoutes } from "./routes/dataRoutes";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { RouteInitializer } from "./types";

const routes: RouteInitializer[] = [
  initHealthcheckRoutes,
  initDataRoutes,
  initControlRoutes,
];

export async function startServer(
  context: ApplicationContext
): Promise<express.Application> {
  return new Promise<express.Application>((resolve, reject) => {
    const port = IS_PROD ? process.env.PORT : 3002;
    const app = express();
    app.use(morgan("tiny"));

    routes.forEach((r) => r(app, context));

    app
      .listen(port, () => {
        console.log(`[INIT] HTTP server listening on port ${port}`);
        resolve(app);
      })
      .on("error", (e: Error) => {
        reject(e);
      });

    return app;
  });
}
