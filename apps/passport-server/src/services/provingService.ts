import {
  hashProveRequest,
  PendingPCD,
  PendingPCDStatus,
  ProveRequest,
  StatusResponse,
  SupportedPCDsResponse,
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import { RLNPCDPackage } from "@pcd/rln-pcd";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { JubJubSignaturePCDPackage } from "jubjub-signature-pcd";
import path from "path";
import { logger } from "../util/logger";

/**
 * Responsible for server-side proving that can optionally be used by clients.
 */
export class ProvingService {
  /**
   * In-memory queue of ProveRequests that requested server-side proving.
   */
  private queue: Array<ProveRequest> = [];

  /**
   * Stores the current StatusResponse of a specific hashed request, which will
   * also include the a full SerialziedPCD if status === COMPLETE
   */
  private pendingPCDResponse: Map<string, StatusResponse> = new Map<
    string,
    StatusResponse
  >();

  /**
   * Each PCD type that the proving server supports has to go into this array,
   * and be initialized properly based on where its artifacts live.
   */
  private packages: PCDPackage[] = [
    SemaphoreGroupPCDPackage,
    SemaphoreSignaturePCDPackage,
    JubJubSignaturePCDPackage,
    RLNPCDPackage,
  ];

  public stop() {
    this.queue = [];
  }

  private getPackage(name: string) {
    const matching = this.packages.find((p) => p.name === name);

    if (matching === undefined) {
      throw new Error(`no package matching ${name}`);
    }

    return matching;
  }

  async enqueueProofRequest(request: ProveRequest): Promise<PendingPCD> {
    const hash = hashProveRequest(request);

    // don't add identical proof requests to queue to prevent accidental or
    // malicious DoS attacks on the proving queue
    if (!this.pendingPCDResponse.has(hash)) {
      this.queue.push(request);
      if (this.queue.length == 1) {
        this.pendingPCDResponse.set(hash, {
          status: PendingPCDStatus.PROVING,
          serializedPCD: undefined,
          error: undefined,
        });

        // we don't wait for this to end; we let it work in the background
        this.serverProve(request);
      } else {
        this.pendingPCDResponse.set(hash, {
          status: PendingPCDStatus.QUEUED,
          serializedPCD: undefined,
          error: undefined,
        });
      }
    }

    const requestResponse = this.pendingPCDResponse.get(hash);
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

  getPendingPCDStatus(hash: string): StatusResponse {
    const response = this.pendingPCDResponse.get(hash);
    if (response !== undefined) return response;
    return {
      serializedPCD: undefined,
      error: undefined,
      status: PendingPCDStatus.NONE,
    };
  }

  /**
   * Performs proof of current ProveRequest, and then checks if there are any other
   * proofs in the queue waiting to start.
   */
  async serverProve(proveRequest: ProveRequest): Promise<void> {
    const currentHash = hashProveRequest(proveRequest);

    try {
      const pcdPackage = this.getPackage(proveRequest.pcdType);
      const pcd = await pcdPackage.prove(proveRequest.args);
      const serializedPCD = await pcdPackage.serialize(pcd);

      // artificial lengthen to test multiple incoming requests
      // await sleep(5000);

      logger(`finished PCD request ${currentHash}`, serializedPCD);
      this.pendingPCDResponse.set(currentHash, {
        status: PendingPCDStatus.COMPLETE,
        serializedPCD: JSON.stringify(serializedPCD),
        error: undefined,
      });
    } catch (e: any) {
      this.pendingPCDResponse.set(currentHash, {
        status: PendingPCDStatus.ERROR,
        serializedPCD: undefined,
        error: e.message,
      });
    }

    // finish current job
    this.queue.shift();

    // check if there's another job
    if (this.queue.length > 0) {
      const topHash = hashProveRequest(this.queue[0]);
      const topResponse = this.pendingPCDResponse.get(topHash);
      if (
        topResponse !== undefined &&
        topResponse.status !== PendingPCDStatus.PROVING
      ) {
        this.pendingPCDResponse.set(topHash, {
          status: PendingPCDStatus.PROVING,
          serializedPCD: undefined,
          error: undefined,
        });
        this.serverProve(this.queue[0]);
      }
    }
  }

  getSupportedPCDTypes(): SupportedPCDsResponse {
    return {
      names: this.packages.map((p) => p.name),
    };
  }
}

export async function startProvingService() {
  const fullPath = path.join(__dirname, "../../public/semaphore-artifacts");

  await SemaphoreGroupPCDPackage.init!({
    wasmFilePath: fullPath + "/16.wasm",
    zkeyFilePath: fullPath + "/16.zkey",
  });

  await SemaphoreSignaturePCDPackage.init!({
    wasmFilePath: fullPath + "/16.wasm",
    zkeyFilePath: fullPath + "/16.zkey",
  });

  const provingService = new ProvingService();
  return provingService;
}
