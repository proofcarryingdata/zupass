import express from "express";
import * as fs from "fs";
import * as https from "https";
import morgan from "morgan";
import { ApplicationContext } from "../types";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { initUploadRoute } from "./routes/uploadRoute";
import { RouteInitializer } from "./types";

const routes: RouteInitializer[] = [initHealthcheckRoutes, initUploadRoute];

export async function startServer(
  context: ApplicationContext
): Promise<express.Application> {
  return new Promise<express.Application>((resolve, reject) => {
    const port = process.env.PORT ?? 3005;
    const app = express();
    app.use(morgan("tiny"));

    routes.forEach((r) => r(app, context));

    const IS_LOCAL_HTTPS = true;
    if (IS_LOCAL_HTTPS) {
      const httpsOptions = {
        key: fs.readFileSync("../certificates/dev.local-key.pem"),
        cert: fs.readFileSync("../certificates/dev.local.pem")
      };

      const appHttps = https
        .createServer(httpsOptions, app)
        .listen(port, () => {
          console.log(`[INIT] Local HTTPS server listening on port ${port}`);
          resolve(app);
        })
        .on("error", (e: Error) => {
          reject(e);
        });
      return appHttps;
    } else {
      app
        .listen(port, () => {
          console.log(`[INIT] HTTP server listening on port ${port}`);
          resolve(app);
        })
        .on("error", (e: Error) => {
          reject(e);
        });
      return app;
    }
  });
}
