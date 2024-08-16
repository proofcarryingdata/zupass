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
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
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
  )[0] as SemaphoreIdentityPCD | undefined;
  const v4PCD = pcdCollection.getPCDsByType(
    SemaphoreIdentityV4PCDPackage.name
  )[0] as SemaphoreIdentityV4PCD | undefined;

  if (!v3PCD || !v4PCD) {
    throw new Error("Expected exactly one v3 and v4 PCD");
  }

  const v4SigOfV3Claim = await PODPCDPackage.prove({
    entries: {
      argumentType: ArgumentTypeName.Object,
      value: {
        signedValue: {
          type: "string",
          value: v3PCD.claim.identity.commitment.toString()
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

export async function verifyAddV4CommitmentRequestPCD(
  pcd: SemaphoreSignaturePCD
): Promise<boolean> {
  try {
    const v3SigVerifies = await SemaphoreSignaturePCDPackage.verify(pcd);
    const expectedV3Id = pcd.claim.identityCommitment;
    const v4SigOfV3Id = await PODPCDPackage.deserialize(
      JSON.parse(pcd.claim.signedMessage).pcd
    );
    const v4SigVerifies = await PODPCDPackage.verify(v4SigOfV3Id);
    const v4Message = v4SigOfV3Id.claim.entries["signedValue"];
    const v4SigIsOfV3Id =
      v4Message.type === "string" && v4Message.value === expectedV3Id;
    return v3SigVerifies && v4SigVerifies && v4SigIsOfV3Id;
  } catch (e) {
    console.log(e);
    return false;
  }
}
