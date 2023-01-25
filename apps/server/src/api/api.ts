import express, { Request, Response } from "express";
import { getDBClient } from "../database/postgresClient";
import { IS_PROD } from "../isProd";
import { getHoneycomb } from "../services/honeycomb";
import { initControlRoutes } from "./routes/controlAPI";
import { initDataRoutes } from "./routes/dataAPI";
import { initHealthcheckRoutes } from "./routes/healthCheckAPI";
import morgan from "morgan";
import opentelemetry from "@opentelemetry/api";

export async function startAPI(): Promise<express.Application> {
  const honeycomb = await getHoneycomb();
  const client = await getDBClient();
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
