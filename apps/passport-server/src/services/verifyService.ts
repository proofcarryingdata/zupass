import {
  SupportedPCDsResponse,
  VerifyRequest,
  VerifyResponse
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import { RLNPCDPackage } from "@pcd/rln-pcd";
import { RSAPCDPackage } from "@pcd/rsa-pcd";
import { RSATicketPCDPackage } from "@pcd/rsa-ticket-pcd";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { JubJubSignaturePCDPackage } from "jubjub-signature-pcd";

/**
 * Responsible for server-side verify.
 */
export class VerifyService {
  /**
   * Each PCD type that the verify service supports has to go into this array,
   * and be initialized properly based on where its artifacts live.
   */
  private packages: PCDPackage[] = [
    SemaphoreGroupPCDPackage,
    SemaphoreSignaturePCDPackage,
    JubJubSignaturePCDPackage,
    RLNPCDPackage,
    RSAPCDPackage,
    RSATicketPCDPackage,
  ];

  public constructor() {}

  private getPackage(name: string): PCDPackage {
    const matching = this.packages.find((p) => p.name === name);

    if (matching === undefined) {
    throw new Error(`no package matching ${name}`);
    }

    return matching;
  }

  public async verify(request: VerifyRequest): Promise<VerifyResponse> {
    const pcdPackage = this.getPackage(request.pcdType);
    const deserializedPCD = await pcdPackage.deserialize(
        JSON.parse(request.serializedPCD).pcd
      );
      if (deserializedPCD.type != request.pcdType) {
        throw new Error(
          `Serialized PCD type ${deserializedPCD.type} does not match type ${request.pcdType}`  
        );
      }
      const verified = await pcdPackage.verify(deserializedPCD);
      return {
        verified
      };
  }

  public getSupportedPCDTypes(): SupportedPCDsResponse {
    return {
      names: this.packages.map((p) => p.name),
    };
  }
}

export function startVerifyService(): VerifyService {
  return new VerifyService();
}
