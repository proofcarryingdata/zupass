// This file is the entry point of the server in development and production
// but not testing. Its main purpose is to load environment variables
// from a configuration file, and then just start the application immediately
// after that.

import cluster from "cluster";
import dotenv from "dotenv";
import os from "os";
import path from "path";
import process from "process";
import { startApplication } from "./application";
import { ServerMode } from "./types";
import { IS_PROD } from "./util/isProd";
import { logger } from "./util/logger";

const dotEnvPath = IS_PROD
  ? path.join(process.cwd(), "../../", ".env")
  : path.join(process.cwd(), ".env");
logger(
  `[INIT] cwd:${process.cwd()}; Loading environment variables from: ${dotEnvPath} `
);
dotenv.config({ path: dotEnvPath });

const clusterEnabled = process.env.ENABLE_CLUSTER === "true";

// see https://nodejs.org/api/cluster.html
// see apps/passport-server/src/routing/middlewares/clusterMiddleware.ts
if (clusterEnabled) {
  if (cluster.isPrimary) {
    const clusterSize = getClusterSize();

    logger(`[CLUSTER] Starting ${clusterSize} workers`);

    for (let i = 0; i < clusterSize; i++) {
      logger(`[CLUSTER] Starting worker ${i}`);
      cluster.fork();
    }

    cluster.on("exit", (worker, code, signal) => {
      logger(
        `[CLUSTER] worker ${worker.process.pid} died with code ${code} and signal ${signal}`
      );
    });

    startApplication(ServerMode.PARALLEL_MAIN);
  } else {
    startApplication(ServerMode.PARALLEL_CHILD);
  }
} else {
  startApplication(ServerMode.UNIFIED);
}

function getClusterSize(): number {
  const numCPUs = os.cpus().length;
  const numWorkers = parseInt(process.env.CLUSTER_PROCESSES ?? `${numCPUs}`);
  if (isNaN(numWorkers)) {
    return numCPUs;
  }
  return Math.max(1, Math.min(numWorkers, numCPUs));
}
