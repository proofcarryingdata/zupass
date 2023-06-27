import cors from "cors";
import express, { NextFunction } from "express";
import morgan from "morgan";
import { EventName, sendEvent } from "../apis/honeycombAPI";
import { ApplicationContext, GlobalServices } from "../types";
import { IS_PROD } from "../util/isProd";
import { tracingMiddleware } from "./middlewares/tracingMiddleware";
import { initE2EERoutes } from "./routes/e2eeRoutes";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { initPCDPassRoutes } from "./routes/pcdpassRoutes";
import { initPCDRoutes } from "./routes/pcdRoutes";
import { initSemaphoreRoutes } from "./routes/semaphoreRoutes";
import { initStaticRoutes } from "./routes/staticRoutes";
import { initStatusRoutes } from "./routes/statusRoutes";
import { initZuzaluRoutes } from "./routes/zuzaluRoutes";

export async function startServer(
  context: ApplicationContext,
  globalServices: GlobalServices
): Promise<express.Application> {
  return new Promise<express.Application>((resolve, reject) => {
    const port = IS_PROD ? process.env.PORT : 3002;
    const app = express();

    app.use(morgan("tiny"));
    app.use(express.json());
    app.use(cors());
    app.use(tracingMiddleware());

    initAllRoutes(app, context, globalServices);

    app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"],
      })
    );

    app.use(
      (
        err: Error,
        req: express.Request,
        res: express.Response,
        _next: NextFunction
      ) => {
        console.error(`[ERROR] ${req.method} ${req.url}`);
        console.error(err.stack);
        res.status(500).send(err.message);
      }
    );

    if (context.rollbar) {
      app.use(context.rollbar.errorHandler);
    }

    app.use((_req, res, _next) => {
      res.status(404).send("Not a valid API route, refer to documentation.");
    });

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

function initAllRoutes(
  app: express.Application,
  context: ApplicationContext,
  globalServices: GlobalServices
) {
  initStatusRoutes(app, context, globalServices);
  initHealthcheckRoutes(app, context);
  initSemaphoreRoutes(app, context, globalServices);
  initE2EERoutes(app, context, globalServices);
  initZuzaluRoutes(app, context, globalServices);
  initPCDPassRoutes(app, context, globalServices);
  initPCDRoutes(app, context);
  initStaticRoutes(app, context);
  initPCDRoutes(app, context);
}
