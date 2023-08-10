import cors from "cors";
import express, { Application, NextFunction } from "express";
import * as http from "http";
import morgan from "morgan";
import { EventName, sendEvent } from "../apis/honeycombAPI";
import { ApplicationContext, GlobalServices } from "../types";
import { IS_PROD } from "../util/isProd";
import { logger } from "../util/logger";
import { tracingMiddleware } from "./middlewares/tracingMiddleware";
import { initDiscordRoutes } from "./routes/discordRoutes";
import { initE2EERoutes } from "./routes/e2eeRoutes";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { initPCDIssuanceRoutes } from "./routes/pcdIssuanceRoutes";
import { initPCDPassRoutes } from "./routes/pcdpassRoutes";
import { initProvingRoutes } from "./routes/provingRoutes";
import { initSemaphoreRoutes } from "./routes/semaphoreRoutes";
import { initStaticRoutes } from "./routes/staticRoutes";
import { initStatusRoutes } from "./routes/statusRoutes";
import { initZuzaluRoutes } from "./routes/zuzaluRoutes";

export async function startServer(
  context: ApplicationContext,
  globalServices: GlobalServices,
): Promise<{ app: Application; server: http.Server }> {
  return new Promise<{ app: Application; server: http.Server }>(
    (resolve, reject) => {
      const port = IS_PROD ? process.env.PORT : 3002;
      const app = express();

      if (process.env.SUPPRESS_LOGGING !== "true") {
        app.use(morgan("tiny"));
      }

      app.use(
        express.json({
          limit: "5mb",
        }),
      );
      app.use(cors());
      app.use(tracingMiddleware());
      app.use(
        cors({
          origin: "*",
          methods: ["GET", "POST", "PUT", "DELETE"],
        }),
      );

      initAllRoutes(app, context, globalServices);

      app.use(
        (
          err: Error,
          req: express.Request,
          res: express.Response,
          _next: NextFunction,
        ) => {
          logger(`[ERROR] ${req.method} ${req.url}`);
          logger(err.stack);
          globalServices.rollbarService?.reportError(err);
          res.status(500).send(err.message);
        },
      );

      const server = app.listen(port, () => {
        logger(`[INIT] HTTP server listening on port ${port}`);
        sendEvent(context, EventName.SERVER_START);
        resolve({ server, app });
      });

      server.on("error", (e: Error) => {
        reject(e);
      });
    },
  );
}

function initAllRoutes(
  app: express.Application,
  context: ApplicationContext,
  globalServices: GlobalServices,
): void {
  initStatusRoutes(app, context, globalServices);
  initHealthcheckRoutes(app, context);
  initSemaphoreRoutes(app, context, globalServices);
  initE2EERoutes(app, context, globalServices);
  initZuzaluRoutes(app, context, globalServices);
  initPCDPassRoutes(app, context, globalServices);
  initProvingRoutes(app, context, globalServices);
  initStaticRoutes(app, context);
  initPCDIssuanceRoutes(app, context, globalServices);
  initDiscordRoutes(app, context, globalServices);
}
