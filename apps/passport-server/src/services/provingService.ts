import { EdDSAFrogPCDPackage } from "@pcd/eddsa-frog-pcd";
import { EdDSAPCDPackage } from "@pcd/eddsa-pcd";
import { EdDSATicketPCDPackage } from "@pcd/eddsa-ticket-pcd";
import {
  hashProveRequest,
  PendingPCD,
  PendingPCDStatus,
  ProofStatusResponseValue,
  ServerProofRequest,
  SupportedPCDsResponseValue
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import { RLNPCDPackage } from "@pcd/rln-pcd";
import { RSAImagePCDPackage } from "@pcd/rsa-image-pcd";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { RSATicketPCDPackage } from "@pcd/rsa-ticket-pcd";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { RollbarService } from "@pcd/server-shared";
import { ZKEdDSAEventTicketPCDPackage } from "@pcd/zk-eddsa-event-ticket-pcd";
import path from "path";
import { PCDHTTPError } from "../routing/pcdHttpError";
import { logger } from "../util/logger";

/**
 * Responsible for server-side proving that can optionally be used by clients.
 */
export class ProvingService {
  private rollbarService: RollbarService | null;

  /**
   * In-memory queue of ProveRequests that requested server-side proving.
   */
  private queue: Array<ServerProofRequest> = [];

  /**
   * Stores the current StatusResponse of a specific hashed request, which will
   * also include the a full SerialziedPCD if status === COMPLETE
   */
  private pendingPCDResponse: Map<string, ProofStatusResponseValue> = new Map<
    string,
    ProofStatusResponseValue
  >();

  /**
   * Each PCD type that the proving server supports has to go into this array,
   * and be initialized properly based on where its artifacts live.
   */
  private packages: PCDPackage[] = [
    SemaphoreGroupPCDPackage,
    SemaphoreSignaturePCDPackage,
    RLNPCDPackage,
    RSAPCDPackage,
    RSATicketPCDPackage,
    EdDSAPCDPackage,
    EdDSATicketPCDPackage,
    RSAImagePCDPackage,
    ZKEdDSAEventTicketPCDPackage
  ];

  public constructor(rollbarService: RollbarService | null) {
    this.rollbarService = rollbarService;
  }

  public stop(): void {
    this.queue = [];
  }

  private getPackage(name: string): PCDPackage {
    const matching = this.packages.find((p) => p.name === name);

    if (matching === undefined) {
      throw new Error(`no package matching ${name}`);
    }

    return matching;
  }

  public async enqueueProofRequest(
    request: ServerProofRequest
  ): Promise<PendingPCD> {
    const hash = hashProveRequest(request);

    // don't add identical proof requests to queue to prevent accidental or
    // malicious DoS attacks on the proving queue
    if (!this.pendingPCDResponse.has(hash)) {
      this.queue.push(request);
      if (this.queue.length === 1) {
        this.pendingPCDResponse.set(hash, {
          status: PendingPCDStatus.PROVING,
          serializedPCD: undefined,
          error: undefined
        });

        // we don't wait for this to end; we let it work in the background
        this.serverProve(request);
      } else {
        this.pendingPCDResponse.set(hash, {
          status: PendingPCDStatus.QUEUED,
          serializedPCD: undefined,
          error: undefined
        });
      }
    }

    const requestResponse = this.pendingPCDResponse.get(hash);
    if (requestResponse === undefined) {
      throw new PCDHTTPError(500, "PCD status not defined");
    }

    const pending: PendingPCD = {
      pcdType: request.pcdType,
      hash: hash,
      status: requestResponse.status
    };

    return pending;
  }

  public getPendingPCDStatus(hash: string): ProofStatusResponseValue {
    const response = this.pendingPCDResponse.get(hash);
    if (response !== undefined) return response;
    return {
      serializedPCD: undefined,
      error: undefined,
      status: PendingPCDStatus.NONE
    };
  }

  /**
   * Performs proof of current ProveRequest, and then checks if there are any other
   * proofs in the queue waiting to start.
   */
  private async serverProve(proveRequest: ServerProofRequest): Promise<void> {
    const currentHash = hashProveRequest(proveRequest);

    try {
      const pcdPackage = this.getPackage(proveRequest.pcdType);
      const pcd = await pcdPackage.prove(proveRequest.args);
      const serializedPCD = await pcdPackage.serialize(pcd);

      logger(`finished PCD request ${currentHash}`, serializedPCD);
      this.pendingPCDResponse.set(currentHash, {
        status: PendingPCDStatus.COMPLETE,
        serializedPCD: JSON.stringify(serializedPCD),
        error: undefined
      });
    } catch (e) {
      logger(e);
      this.rollbarService?.reportError(e);
      this.pendingPCDResponse.set(currentHash, {
        status: PendingPCDStatus.ERROR,
        serializedPCD: undefined,
        error: e instanceof Error ? e.message : ""
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
          error: undefined
        });
        this.serverProve(this.queue[0]);
      }
    }
  }

  public getSupportedPCDTypes(): SupportedPCDsResponseValue {
    return {
      names: this.packages.map((p) => p.name)
    };
  }
}

export async function startProvingService(
  rollbarService: RollbarService | null
): Promise<ProvingService | null> {
  if (process.env.SELF_HOSTED_PODBOX_MODE === "true") {
    logger(
      `[INIT] SELF_HOSTED_PODBOX_MODE is true - not starting proving service`
    );
    return null;
  }

  const fullPath = path.join(__dirname, "../../public");

  await SemaphoreGroupPCDPackage.init?.({
    wasmFilePath: fullPath + "/semaphore-artifacts/16.wasm",
    zkeyFilePath: fullPath + "/semaphore-artifacts/16.zkey"
  });

  await SemaphoreSignaturePCDPackage.init?.({
    wasmFilePath: fullPath + "/semaphore-artifacts/16.wasm",
    zkeyFilePath: fullPath + "/semaphore-artifacts/16.zkey"
  });

  await RSATicketPCDPackage.init?.({ makeEncodedVerifyLink: undefined });
  await EdDSAFrogPCDPackage.init?.({ makeEncodedVerifyLink: undefined });
  await EdDSATicketPCDPackage.init?.({ makeEncodedVerifyLink: undefined });

  await ZKEdDSAEventTicketPCDPackage.init?.({
    wasmFilePath:
      fullPath + "/artifacts/zk-eddsa-event-ticket-pcd/circuit.wasm",
    zkeyFilePath: fullPath + "/artifacts/zk-eddsa-event-ticket-pcd/circuit.zkey"
  });

  const provingService = new ProvingService(rollbarService);
  return provingService;
}
