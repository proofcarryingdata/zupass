import cookieParser from "cookie-parser";
import cors, { CorsOptions } from "cors";
import express, { Application, NextFunction } from "express";
import * as fs from "fs";
import * as http from "http";
import * as https from "https";
import morgan from "morgan";
import nocache from "nocache";
import { EventName, sendEvent } from "../apis/honeycombAPI";
import {
  ApplicationContext,
  GlobalServices,
  ServerMode,
  Zupass
} from "../types";
import { logger } from "../util/logger";
import { getClusterPort } from "./middlewares/clusterMiddleware";
import { tracingMiddleware } from "./middlewares/tracingMiddleware";
import { respondWithError } from "./pcdHttpError";
import { initAccountRoutes } from "./routes/accountRoutes";
import { initE2EERoutes } from "./routes/e2eeRoutes";
import { initFrogcryptoRoutes } from "./routes/frogcryptoRoutes";
import { initGenericIssuanceRoutes } from "./routes/genericIssuanceRoutes";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { initLogRoutes } from "./routes/logRoutes";
import { initMiscRoutes } from "./routes/miscRoutes";
import { initPCDIssuanceRoutes } from "./routes/pcdIssuanceRoutes";
import { initPoapRoutes } from "./routes/poapRoutes";
import { initProvingRoutes } from "./routes/provingRoutes";
import { initSemaphoreRoutes } from "./routes/semaphoreRoutes";
import { initStaticRoutes } from "./routes/staticRoutes";
import { initStatusRoutes } from "./routes/statusRoutes";
import { initTelegramRoutes } from "./routes/telegramRoutes";

export async function startHttpServer(
  context: ApplicationContext,
  globalServices: GlobalServices
): Promise<{ app: Application; server: http.Server; localEndpoint: string }> {
  return new Promise<{
    app: Application;
    server: http.Server;
    localEndpoint: string;
  }>((resolve, reject) => {
    let port = parseInt(process.env.PORT ?? "3002", 10);

    if (context.mode === ServerMode.PARALLEL_CHILD) {
      port = getClusterPort();
    }

    if (isNaN(port)) {
      throw new Error("couldn't start http server, missing port");
    }

    const app = express();
    app.use(nocache());
    app.set("etag", false);

    if (process.env.SUPPRESS_LOGGING !== "true") {
      app.use(morgan("tiny"));
    }

    app.use(cookieParser());
    app.use(
      express.json({
        limit: "5mb"
      })
    );
    app.use(tracingMiddleware());
    app.use(
      cors((req, callback) => {
        // Requests from generic issuance client require Access-Control-Allow-Credentials to be true,
        // as the generic issuance client sends cookies as part of user authentication. However, when
        // Access-Control-Allow-Origin is set to wildcard "*", setting credentials to true is forbidden:
        // https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS/Errors/CORSNotSupportingCredentials.
        // As a result, if we are receiving a request from generic issuance client, we set a single origin
        // equal to the generic issuance client URL and set credential to true. Otherwise, we return
        // a wildcard origin "*" and set credential to false.
        const genericIssuanceClientUrl =
          process.env.GENERIC_ISSUANCE_CLIENT_URL;

        let corsOptions: CorsOptions;
        const methods = ["GET", "POST", "PUT", "DELETE"];
        if (
          genericIssuanceClientUrl &&
          req.header("Origin") === genericIssuanceClientUrl
        ) {
          corsOptions = {
            origin: genericIssuanceClientUrl,
            credentials: true,
            methods
          };
        } else {
          corsOptions = {
            origin: "*",
            methods
          };
        }

        // 86400 is the highest value supported by browsers for caching CORS
        // responses
        corsOptions.maxAge = 86400;

        // Allows a later middleware to add additional caching headers
        corsOptions.preflightContinue = true;

        callback(null, corsOptions);
      })
    );

    // Add cache-control to preflight CORS responses in a separate middleware
    // This is required for the browser to be able to cache these requests
    app.use((req, res, next) => {
      if (req.method === "OPTIONS") {
        res.setHeader("Cache-Control", "public, max-age=86400");
        res.end();
      } else {
        next();
      }
    });

    initAllRoutes(app, context, globalServices);

    app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        _next: NextFunction
      ) => {
        logger(`[ERROR] ${req.method} ${req.url}`);
        logger(err);
        logger(err.stack);
        globalServices.rollbarService?.reportError(err);
        respondWithError(err, res);
      }
    );

    if (process.env.IS_LOCAL_HTTPS === "true") {
      const localEndpoint = `https://dev.local:${port}`;
      const httpsOptions = {
        key: fs.readFileSync("../certificates/dev.local-key.pem"),
        cert: fs.readFileSync("../certificates/dev.local.pem")
      };

      const server = https.createServer(httpsOptions, app).listen(port, () => {
        logger(`[INIT] Local HTTPS server listening on ${localEndpoint}`);
        sendEvent(context, EventName.SERVER_START);
        resolve({ server, app, localEndpoint });
      });

      server.on("error", (e: Error) => {
        reject(e);
      });
    } else {
      const localEndpoint = `http://localhost:${port}`;
      const server = app.listen(port, () => {
        logger(`[INIT] HTTP server listening on port ${port}`);
        sendEvent(context, EventName.SERVER_START);
        resolve({ server, app, localEndpoint });
      });
      server.on("error", (e: Error) => {
        reject(e);
      });
    }
  });
}

function initAllRoutes(
  app: express.Application,
  context: ApplicationContext,
  globalServices: GlobalServices
): void {
  initStatusRoutes(app, globalServices);
  initHealthcheckRoutes(app, context);
  initSemaphoreRoutes(app, context, globalServices);
  initE2EERoutes(app, context, globalServices);
  initAccountRoutes(app, context, globalServices);
  initProvingRoutes(app, context, globalServices);
  initStaticRoutes(app, context);
  initPCDIssuanceRoutes(app, context, globalServices);
  initTelegramRoutes(app, context, globalServices);
  initFrogcryptoRoutes(app, context, globalServices);
  initPoapRoutes(app, context, globalServices);
  initLogRoutes(app);
  initMiscRoutes(app, context, globalServices);
  initGenericIssuanceRoutes(app, context, globalServices);
}

export function stopHttpServer(app: Zupass): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    app.expressContext.server.close((err) => {
      if (err) {
        logger(`error stopping http server`, err);
        reject(err);
      } else {
        resolve();
      }
    });
  });
}
