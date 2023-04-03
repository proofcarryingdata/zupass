import {
  hashProveRequest,
  PendingPCD,
  PendingPCDStatus,
  ProveRequest,
  StatusResponse,
  SupportedPCDsResponse,
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import path from "path";

const queue: Array<ProveRequest> = [];
const pendingPCDStatus: Map<string, PendingPCDStatus> = new Map<
  string,
  PendingPCDStatus
>();
const pendingPCDResult: Map<string, string> = new Map<string, string>();

/**
 * Each PCD type that the proving server supports has to go into this array,
 * and be initialized properly based on where its artifacts live.
 */
const packages: PCDPackage[] = [
  SemaphoreGroupPCDPackage,
  SemaphoreSignaturePCDPackage,
];

export async function initPackages() {
  const fullPath = path.join(__dirname, "../../public/semaphore-artifacts");

  await SemaphoreGroupPCDPackage.init!({
    wasmFilePath: fullPath + "/16.wasm",
    zkeyFilePath: fullPath + "/16.zkey",
  });

  await SemaphoreSignaturePCDPackage.init!({
    wasmFilePath: fullPath + "/16.wasm",
    zkeyFilePath: fullPath + "/16.zkey",
  });
}

function getPackage(name: string) {
  const matching = packages.find((p) => p.name === name);

  if (matching === undefined) {
    throw new Error(`no package matching ${name}`);
  }

  return matching;
}

export async function enqueueProofRequest(
  request: ProveRequest
): Promise<PendingPCD> {
  const hash = hashProveRequest(request);

  // don't add identical proof requests to queue to prevent accidental or
  // malicious DoS attacks on the proving queue
  if (!pendingPCDStatus.has(hash)) {
    queue.push(request);
    if (queue.length == 1) {
      pendingPCDStatus.set(hash, PendingPCDStatus.PROVING);

      // we don't wait for this to end; we let it work in the background
      serverProve(request);
    } else {
      pendingPCDStatus.set(hash, PendingPCDStatus.QUEUED);
    }
  }

  const requestStatus = pendingPCDStatus.get(hash);
  if (requestStatus === undefined) {
    throw new Error("PCD status not defined");
  }

  const pending: PendingPCD = {
    pcdType: request.pcdType,
    hash: hash,
    status: requestStatus,
  };

  return pending;
}

export function getPendingPCDStatus(hash: string): StatusResponse {
  const response: StatusResponse = {
    serializedPCD: "",
    status: PendingPCDStatus.NONE,
  };

  const status = pendingPCDStatus.get(hash);
  const serializedPCD = pendingPCDResult.get(hash);
  if (status !== undefined) {
    response.status = status;
    if (status === PendingPCDStatus.COMPLETE && serializedPCD !== undefined) {
      response.serializedPCD = serializedPCD;
    }
  }

  return response;
}

async function serverProve(proveRequest: ProveRequest): Promise<void> {
  const pcdPackage = getPackage(proveRequest.pcdType);
  const currentHash = hashProveRequest(proveRequest);

  try {
    const pcd = await pcdPackage.prove(proveRequest.args);
    const serializedPCD = await pcdPackage.serialize(pcd);

    // artificial lengthen to test multiple incoming requests
    // await sleep(5000);

    console.log(`finished PCD request ${currentHash}`, serializedPCD);
    pendingPCDStatus.set(currentHash, PendingPCDStatus.COMPLETE);
    pendingPCDResult.set(currentHash, JSON.stringify(serializedPCD));
  } catch (e) {
    pendingPCDStatus.set(currentHash, PendingPCDStatus.ERROR);
  }

  // finish current job
  queue.shift();

  // check if there's another job
  if (queue.length > 0) {
    const topHash = hashProveRequest(queue[0]);
    if (pendingPCDStatus.get(topHash) !== PendingPCDStatus.PROVING) {
      pendingPCDStatus.set(topHash, PendingPCDStatus.PROVING);
      serverProve(queue[0]);
    }
  }
}

export function getSupportedPCDTypes(): SupportedPCDsResponse {
  return {
    names: packages.map((p) => p.name),
  };
}
