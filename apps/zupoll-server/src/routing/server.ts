import cors from "cors";
import express, { NextFunction } from "express";
import * as fs from "fs";
import * as https from "https";
import morgan from "morgan";
import { ApplicationContext } from "../application";
import { logger } from "../util/logger";
import { initAuthedRoutes } from "./routes/authedRoutes";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { initPCDRoutes } from "./routes/pollRoutes";

export interface RouteInitializer {
  (app: express.Application, context: ApplicationContext): void;
}

const routes: RouteInitializer[] = [
  initHealthcheckRoutes,
  initAuthedRoutes,
  initPCDRoutes
];

export async function startServer(
  context: ApplicationContext
): Promise<express.Application> {
  return new Promise<express.Application>((resolve, reject) => {
    const port = process.env.PORT ?? 3011;
    const app = express();

    logger.info(`[INIT] Zupoll Webserver: http://localhost:${port}`);
    logger.info(`[INIT] NODE_ENV`, process.env.NODE_ENV);

    app.use(morgan("tiny"));
    app.use(express.json());
    app.use(cors());

    routes.forEach((r) => r(app, context));

    app.use(
      cors({
        origin: "*",
        methods: ["GET", "POST", "PUT", "DELETE"]
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
        res.status(500).type("text").send(err.message);
      }
    );

    if (process.env.IS_LOCAL_HTTPS === "true") {
      const localEndpoint = `https://dev.local:${port}`;
      const httpsOptions = {
        key: fs.readFileSync("../certificates/dev.local-key.pem"),
        cert: fs.readFileSync("../certificates/dev.local.pem")
      };

      const server = https.createServer(httpsOptions, app).listen(port, () => {
        logger.info(`[INIT] Local HTTPS server listening on ${localEndpoint}`);
        resolve(app);
      });

      server.on("error", (e: Error) => {
        reject(e);
      });
    } else {
      const server = app.listen(port, () => {
        resolve(app);
      });
      server.on("error", (e: Error) => {
        reject(e);
      });
    }

    return app;
  });
}
