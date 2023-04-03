import {
  hashProveRequest,
  PendingPCD,
  PendingPCDStatus,
  ProveRequest,
  ProveResponse,
  SupportedPCDsResponse,
  VerifyRequest,
  VerifyResponse,
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import path from "path";

const queue: Array<ProveRequest> = [];
const stampStatus: Map<string, PendingPCDStatus> = new Map<
  string,
  PendingPCDStatus
>();
const stampResult: Map<string, ProveResponse> = new Map<
  string,
  ProveResponse
>();

/**
 * Each PCD type that the proving server supports has to go into this array,
 * and be initialized properly based on where its artifacts live.
 */
const packages: PCDPackage[] = [SemaphoreGroupPCDPackage];

export async function initPackages() {
  const fullPath = path.join(__dirname, "../../public/semaphore-artifacts");

  await SemaphoreGroupPCDPackage.init!({
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
  if (!stampStatus.has(hash)) {
    queue.push(request);
    if (queue.length == 1) {
      stampStatus.set(hash, PendingPCDStatus.PROVING);

      // we don't wait for this to end; we let it work in the background
      serverProve(request);
    } else {
      stampStatus.set(hash, PendingPCDStatus.QUEUED);
    }
  }

  const requestStatus = stampStatus.get(hash);
  if (requestStatus === undefined) {
    throw new Error("Stamp status not defined");
  }

  const pending: PendingPCD = {
    pcdType: request.pcdType,
    hash: hash,
    status: requestStatus,
  };

  return pending;
}

export function getPendingPCDStatus(hash: string): PendingPCDStatus {
  const status = stampStatus.get(hash);
  if (status !== undefined) {
    return status;
  }
  return PendingPCDStatus.NONE;
}

export function getPendingPCDResult(hash: string): ProveResponse {
  const result = stampResult.get(hash);
  if (
    result !== undefined &&
    stampStatus.get(hash) === PendingPCDStatus.COMPLETE
  ) {
    return result;
  }
  const empty: ProveResponse = {
    serializedPCD: "",
  };
  return empty;
}

export async function serverProve(proveRequest: ProveRequest): Promise<void> {
  const pcdPackage = getPackage(proveRequest.pcdType);
  const currentHash = hashProveRequest(proveRequest);

  try {
    const pcd = await pcdPackage.prove(proveRequest.args);
    const serializedPCD = await pcdPackage.serialize(pcd);
    console.log(`finished PCD request ${currentHash}`, serializedPCD);
    stampStatus.set(currentHash, PendingPCDStatus.COMPLETE);
    stampResult.set(currentHash, {
      serializedPCD: JSON.stringify(serializedPCD),
    });
  } catch (e) {
    stampStatus.set(currentHash, PendingPCDStatus.ERROR);
  }

  // finish current job
  queue.shift();

  // check if there's another job
  if (queue.length > 0) {
    const topHash = hashProveRequest(queue[0]);
    if (stampStatus.get(topHash) !== PendingPCDStatus.PROVING) {
      stampStatus.set(topHash, PendingPCDStatus.PROVING);
      serverProve(queue[0]);
    }
  }
}

export async function serverVerify(
  verifyRequest: VerifyRequest
): Promise<VerifyResponse> {
  const pcdPackage = getPackage(verifyRequest.pcdType);
  const deserializedPCD = await pcdPackage.deserialize(
    verifyRequest.serializedPCD
  );
  const verified = await pcdPackage.verify(deserializedPCD);
  return { verified };
}

export function getSupportedPCDTypes(): SupportedPCDsResponse {
  return {
    names: packages.map((p) => p.name),
  };
}
