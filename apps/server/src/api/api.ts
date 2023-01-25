import express from "express";
import morgan from "morgan";
import { getDBClient } from "../database/postgresClient";
import { startMetrics } from "../services/metrics";
import { IS_PROD } from "../util/isProd";
import { initControlRoutes } from "./routes/controlAPI";
import { initDataRoutes } from "./routes/dataAPI";
import { initHealthcheckRoutes } from "./routes/healthCheckAPI";

export async function startAPI(): Promise<express.Application> {
  const client = await getDBClient();
  startMetrics();

  const routes = [initHealthcheckRoutes, initDataRoutes, initControlRoutes];

  return new Promise<express.Application>((resolve, reject) => {
    const port = IS_PROD ? process.env.PORT : 3002;
    const app = express();
    app.use(morgan("tiny"));

    routes.forEach((r) => r(app, client));

    app
      .listen(port, () => {
        console.log(`App listening on port ${port}`);
        resolve(app);
      })
      .on("error", (e: Error) => {
        reject(e);
      });

    return app;
  });
}
