import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { PODPCDPackage } from "@pcd/pod-pcd";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreIdentityV4PCD,
  SemaphoreIdentityV4PCDPackage
} from "@pcd/semaphore-identity-v4";
import { SemaphoreSignaturePCDPackage } from "@pcd/semaphore-signature-pcd";
import { randomUUID, toHexString } from "@pcd/util";
import urljoin from "url-join";
import {
  AddV4CommitmentRequest,
  AddV4CommitmentResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks a feed for new PCDs.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestAddSemaphoreV4Commitment(
  zupassServerUrl: string,
  req: AddV4CommitmentRequest
): Promise<AddV4CommitmentResult> {
  return httpPostSimple(
    urljoin(zupassServerUrl, "/account/add-v4-commitment"),
    async (resText) => ({
      value: JSON.parse(resText) as AddV4CommitmentResponseValue,
      success: true
    }),
    req
  );
}

export type AddV4CommitmentResult = APIResult<AddV4CommitmentResponseValue>;

export async function makeAddV4CommitmentRequest(
  pcdCollection: PCDCollection
): Promise<AddV4CommitmentRequest> {
  const v3PCD = pcdCollection.getPCDsByType(
    SemaphoreIdentityPCDPackage.name
  )[0] as SemaphoreIdentityPCD;
  const v4PCD = pcdCollection.getPCDsByType(
    SemaphoreIdentityV4PCDPackage.name
  )[0] as SemaphoreIdentityV4PCD;

  if (!v3PCD || !v4PCD) {
    throw new Error("Expected exactly one v3 and v4 PCD");
  }

  const v4SigOfV3Claim = await PODPCDPackage.prove({
    entries: {
      argumentType: ArgumentTypeName.Object,
      value: {
        signedValue: {
          type: "string",
          value: JSON.stringify(v3PCD)
        }
      }
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value:
        typeof v4PCD.claim.identity.privateKey === "string"
          ? v4PCD.claim.identity.privateKey
          : toHexString(v4PCD.claim.identity.privateKey)
    },
    id: {
      argumentType: ArgumentTypeName.String,
      value: randomUUID()
    }
  });

  const v3SigOfV4Sig = await SemaphoreSignaturePCDPackage.prove({
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(v3PCD)
    },
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: JSON.stringify(await PODPCDPackage.serialize(v4SigOfV3Claim))
    }
  });

  return {
    pcd: await SemaphoreSignaturePCDPackage.serialize(v3SigOfV4Sig)
  };
}
