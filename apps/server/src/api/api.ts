import express, { Request, Response } from "express";
import { getDBClient } from "../database/postgresClient";
import { IS_PROD } from "../isProd";
import { initDataRoutes } from "./routes/dataAPI";
import { initHealthcheckRoutes } from "./routes/healthCheckAPI";

export async function startAPI(): Promise<express.Application> {
  const client = await getDBClient();
  const routes = [initHealthcheckRoutes, initDataRoutes];

  return new Promise<express.Application>((resolve, reject) => {
    const port = IS_PROD ? process.env.PORT : 3002;
    const app = express();

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
