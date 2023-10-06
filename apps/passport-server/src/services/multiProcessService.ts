import { SerializedPCD } from "@pcd/pcd-types";
import { SemaphoreSignaturePCD } from "@pcd/semaphore-signature-pcd";
import * as os from "os";
import * as path from "path";
import makeFarm from "worker-farm";
import { logger } from "../util/logger";
import { traced } from "./telemetryService";

const LOG_NAME = "Multiprocess";

type WorkerFarm = ReturnType<typeof makeFarm>;

/**
 * The absolute path to the location where the compiled version of `worker.ts`
 * lives.
 *
 * @todo: how to do this more robustly? eg. how to prevent this file from being
 * moved without the developer seeing something went wrong?
 */
const WORKER_MODULE_PATH = path.join(
  process.cwd(),
  "build/src/multiprocess/worker.js"
);

const DEFAULT_WORKER_QUANTITY = os.cpus().length;

/**
 * This class contains one function per type of task that can be
 * offloaded to a background process. Under the hood, MultiProcessService
 * spawns several Node.js processes with the code located in {@link worker.ts}
 * (which also lives in this codebase). Requests to perform a background task are
 * load balanced amongst several of those background processes.
 */
export class MultiProcessService {
  /**
   * See the documentation of how this object works here:
   * https://www.npmjs.com/package/worker-farm
   */
  private workers: WorkerFarm;
  private jobs: Record<string, Map<string, Promise<any>>>;

  public constructor() {
    const workerQuantityFromEnvironment = parseInt(
      process.env.WORKER_QUANTITY ?? "",
      10
    );
    const workerQuantity = isNaN(workerQuantityFromEnvironment)
      ? DEFAULT_WORKER_QUANTITY
      : workerQuantityFromEnvironment;

    logger(
      `[MULTIPROCESS] process.env.WORKER_QUANTITY:`,
      process.env.WORKER_QUANTITY
    );
    logger(`[MULTIPROCESS] starting ${workerQuantity} workers`);

    this.workers = makeFarm(
      {
        autoStart: true,
        maxConcurrentWorkers: workerQuantity,
        maxRetries: 1,
        maxConcurrentCalls: 1000
      },
      WORKER_MODULE_PATH
    );

    this.jobs = {
      verifySignaturePCD: new Map<string, Promise<boolean>>()
    };
  }

  /**
   * Appends a request to verify a {@link SemaphoreSignaturePCD} to a queue
   * of worker processes.
   */
  public verifySignaturePCD(
    pcd: SerializedPCD<SemaphoreSignaturePCD>
  ): Promise<boolean> {
    // todo: if/when we have multiple tasks that can be run in the background,
    // we're going to need to encapsulate the mechanism by which we translate
    // requests to `MultiProcessService` into requests that `WorkerFarm` can
    // handle. Eg. a common thing we're going to need to do is wrap the call
    // to the worker farm in a promise.
    return traced(LOG_NAME, "verifySignaturePCD", async () => {
      logger("[MULTIPROCESS] verifying a semaphore signature");
      // Are we already processing an identical job?
      if (this.jobs.verifySignaturePCD.has(pcd.pcd)) {
        return this.jobs.verifySignaturePCD.get(pcd.pcd);
      }
      const promise = new Promise<boolean>((resolve, reject) => {
        // We could also implement a poor man's cache here by deleting the job
        // after a timeout, so that any attempt to verify the same PCD again
        // would be returned an already-resolved promise. Would also save a
        // round-trip to the DB or other cache backend.
        this.jobs.verifySignaturePCD.delete(pcd.pcd);
        this.workers(JSON.stringify(pcd), (err: Error, result: boolean) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
      // The Map class can probably figure out how to turn the serialized PCD
      // string into a good map key hash better than we can
      this.jobs.verifySignaturePCD.set(pcd.pcd, promise);
      return promise;
    });
  }

  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      makeFarm.end(this.workers, (err: Error | null) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

export function startMultiProcessService(): MultiProcessService {
  logger("[INIT] starting multiprocess service");
  return new MultiProcessService();
}
