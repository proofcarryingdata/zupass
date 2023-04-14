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
import { JubJubSignaturePCDPackage } from "jubjub-signature-pcd";
import path from "path";

/**
 * In-memory queue of ProveRequests that requested server-side proving.
 */
const queue: Array<ProveRequest> = [];

/**
 * Stores the current StatusResponse of a specific hashed request, which will
 * also include the a full SerialziedPCD if status === COMPLETE
 */
const pendingPCDResponse: Map<string, StatusResponse> = new Map<
  string,
  StatusResponse
>();

/**
 * Each PCD type that the proving server supports has to go into this array,
 * and be initialized properly based on where its artifacts live.
 */
const packages: PCDPackage[] = [
  SemaphoreGroupPCDPackage,
  SemaphoreSignaturePCDPackage,
  JubJubSignaturePCDPackage
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
  if (!pendingPCDResponse.has(hash)) {
    queue.push(request);
    if (queue.length == 1) {
      pendingPCDResponse.set(hash, {
        status: PendingPCDStatus.PROVING,
        serializedPCD: "",
      });

      // we don't wait for this to end; we let it work in the background
      serverProve(request);
    } else {
      pendingPCDResponse.set(hash, {
        status: PendingPCDStatus.QUEUED,
        serializedPCD: "",
      });
    }
  }

  const requestResponse = pendingPCDResponse.get(hash);
  if (requestResponse === undefined) {
    throw new Error("PCD status not defined");
  }

  const pending: PendingPCD = {
    pcdType: request.pcdType,
    hash: hash,
    status: requestResponse.status,
  };

  return pending;
}

export function getPendingPCDStatus(hash: string): StatusResponse {
  const response = pendingPCDResponse.get(hash);
  if (response !== undefined) return response;
  return {
    serializedPCD: "",
    status: PendingPCDStatus.NONE,
  };
}

/**
 * Performs proof of current ProveRequest, and then checks if there are any other
 * proofs in the queue waiting to start.
 */
async function serverProve(proveRequest: ProveRequest): Promise<void> {
  const pcdPackage = getPackage(proveRequest.pcdType);
  const currentHash = hashProveRequest(proveRequest);

  try {
    const pcd = await pcdPackage.prove(proveRequest.args);
    const serializedPCD = await pcdPackage.serialize(pcd);

    // artificial lengthen to test multiple incoming requests
    // await sleep(5000);

    console.log(`finished PCD request ${currentHash}`, serializedPCD);
    pendingPCDResponse.set(currentHash, {
      status: PendingPCDStatus.COMPLETE,
      serializedPCD: JSON.stringify(serializedPCD),
    });
  } catch (e) {
    pendingPCDResponse.set(currentHash, {
      status: PendingPCDStatus.ERROR,
      serializedPCD: "",
    });
  }

  // finish current job
  queue.shift();

  // check if there's another job
  if (queue.length > 0) {
    const topHash = hashProveRequest(queue[0]);
    const topResponse = pendingPCDResponse.get(topHash);
    if (
      topResponse !== undefined &&
      topResponse.status !== PendingPCDStatus.PROVING
    ) {
      pendingPCDResponse.set(topHash, {
        status: PendingPCDStatus.PROVING,
        serializedPCD: "",
      });
      serverProve(queue[0]);
    }
  }
}

export function getSupportedPCDTypes(): SupportedPCDsResponse {
  return {
    names: packages.map((p) => p.name),
  };
}
