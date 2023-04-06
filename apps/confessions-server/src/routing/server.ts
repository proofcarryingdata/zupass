import cors from "cors";
import express, { NextFunction } from "express";
import morgan from "morgan";
import { ApplicationContext } from "../types";
import { initHealthcheckRoutes } from "./routes/healthCheckRoutes";
import { initAuthedRoutes } from "./routes/authedRoutes";
import { initPCDRoutes } from "./routes/pcdRoutes";
import { RouteInitializer } from "./types";

const routes: RouteInitializer[] = [
  initHealthcheckRoutes,
  initAuthedRoutes,
  initPCDRoutes,
];

export async function startServer(
  context: ApplicationContext
): Promise<express.Application> {
  return new Promise<express.Application>((resolve, reject) => {
    const port = process.env.PORT;
    const app = express();

    app.use(morgan("tiny"));
    app.use(express.json());
    app.use(cors());

    routes.forEach((r) => r(app, context));

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
