import express from "express";
import morgan from "morgan";
import { EventName, sendEvent } from "../apis/honeycombAPI";
import { ApplicationContext } from "../types";
import { IS_PROD } from "../util/isProd";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { RouteInitializer } from "./types";

const routes: RouteInitializer[] = [initHealthcheckRoutes];

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
        sendEvent(context, EventName.SERVER_START);
        resolve(app);
      })
      .on("error", (e: Error) => {
        reject(e);
      });

    return app;
  });
}
