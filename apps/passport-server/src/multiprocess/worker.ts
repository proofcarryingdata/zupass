/**
 * This file runs inside a child process of the zupass server. It comprises
 * the entire surface area of the tasks that the Zupass server can perform
 * in the background. You can put tasks that are CPU-bound here, so that they
 * can be performed in a background thread.
 *
 * See {@link MultiProcessService} to understand how exactly this worker is invoked.
 */

import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { logger } from "../util/logger";

logger("[WORKER] initializing a process. pid: " + process.pid);

const verify = async (serializedSerializedPCD: string): Promise<boolean> => {
  logger(
    "[WORKER] verifying a semaphore signature pcd",
    serializedSerializedPCD
  );

  const parsed = JSON.parse(serializedSerializedPCD);

  const deserialized = await SemaphoreSignaturePCDPackage.deserialize(
    parsed.pcd
  );

  const valid = await SemaphoreSignaturePCDPackage.verify(deserialized);

  logger(`[WORKER] valid: ${valid}`, "pcd:", serializedSerializedPCD);

  return valid;
};

// It is possible to strongly type the interface between
// the Zupass server and this worker process. I have not done
// that - we should probably wait until at least the 2nd
// cpu-bound task needs to run on the server.
//
// worth noting that a worker can export multiple named functions,
// so we don't have to have one worker per function.
module.exports = function workerVerify(
  serializedSerializedPCD: string,
  callback: (err: Error | null, valid: boolean | null) => void
): void {
  logger("[WORKER] handling a request");
  verify(serializedSerializedPCD)
    .then((r) => callback(null, r))
    .catch((e) => callback(e, null));
};
