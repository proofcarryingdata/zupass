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
 * Very simple in-memory Least-Recently-Used cache
 */
class LruCache<T> {
  private map: Map<string, T>;
  private capacity: number;

  public constructor(capacity: number) {
    this.capacity = capacity;
    this.map = new Map();
  }

  public get(key: string): T | undefined {
    const value = this.map.get(key);

    if (!value) {
      return undefined;
    }

    // Since we're using the key, reset it to flag it as having been used
    this.map.delete(key);
    this.map.set(key, value);

    return value;
  }

  public set(key: string, value: T): void {
    this.map.delete(key);

    if (this.map.size + 1 === this.capacity) {
      // Map keys are stored in the order they're added, so the first key
      // is the oldest.
      this.map.delete(this.map.keys().next().value);
    }

    this.map.set(key, value);
  }

  public delete(key: string): void {
    this.map.delete(key);
  }

  public has(key: string): boolean {
    return this.map.has(key);
  }
}

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
  private jobs: Record<string, LruCache<any>>;

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
      verifySignaturePCD: new LruCache<Promise<boolean>>(100)
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
      const payload = JSON.stringify(pcd);
      // Are we already processing an identical job?
      // Using the stringified payload as the cache key
      if (this.jobs.verifySignaturePCD.has(payload)) {
        return this.jobs.verifySignaturePCD.get(payload);
      }
      const promise = new Promise<boolean>((resolve, reject) => {
        this.workers(payload, (err: Error, result: boolean) => {
          if (err) {
            reject(err);
          } else {
            resolve(result);
          }
        });
      });
      this.jobs.verifySignaturePCD.set(payload, promise);
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
