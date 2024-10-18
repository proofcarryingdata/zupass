import express, { Request, Response } from "express";
import process from "process";
import { ApplicationContext } from "../../types";
import { logger } from "../../util/logger";
import { clusterProxy } from "../middlewares/clusterMiddleware";

export function initHealthcheckRoutes(
  app: express.Application,
  _context: ApplicationContext
): void {
  logger("[INIT] initializing health check routes");

  /**
   * Used by render.com to detect whether the backend is ready,
   * so that it can kill the other instance during a deploy (which
   * enables zero-downtime deploys).
   *
   * render.com also uses this as a health check to detect wither
   * the backend has gone down in order to be able to restart it
   * when necessary.
   */
  app.get("/", async (req: Request, res: Response) => {
    res.status(200).send(`Zupass Server - OK! ${process.pid}`);
  });

  // for testing the cluster proxy middleware
  // should return the PID of the cluster child process that ends up handling
  // this request, *NOT* the PID of the main process.
  app.get(
    "/test-cluster",
    clusterProxy(),
    async (req: Request, res: Response) => {
      res
        .status(200)
        .send(`Zupass Server - Cluster Test OK! PID: ${process.pid}`);
    }
  );

  // for testing the cluster proxy middleware
  // should return the PID of the cluster child process that ends up handling
  // this request, *NOT* the PID of the main process. Should also return the
  // body of the request properly.
  app.post(
    "/test-cluster-post",
    clusterProxy(),
    async (req: Request, res: Response) => {
      res
        .status(200)
        .send(
          `Zupass Server - Cluster Test OK! PID: ${
            process.pid
          } - body was ${JSON.stringify(req.body, null, 2)}`
        );
    }
  );

  // should return the PID of main application process, as well as the body of
  // the request. this request is intentionally *NOT* proxied by the cluster proxy
  // middleware.
  app.post(
    "/test-cluster-post-unproxied",
    async (req: Request, res: Response) => {
      res
        .status(200)
        .send(
          `Zupass Server - Cluster Test OK! PID: ${
            process.pid
          } - body was ${JSON.stringify(req.body, null, 2)}`
        );
    }
  );
}
