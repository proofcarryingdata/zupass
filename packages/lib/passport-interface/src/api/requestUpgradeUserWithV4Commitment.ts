import { PCDCollection } from "@pcd/pcd-collection";
import { ArgumentTypeName } from "@pcd/pcd-types";
import { podEntriesToJSON } from "@pcd/pod";
import { PODPCDPackage } from "@pcd/pod-pcd";
import {
  SemaphoreIdentityPCD,
  SemaphoreIdentityPCDPackage,
  v4PrivateKey,
  v4PublicKeyToCommitment
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { randomUUID } from "@pcd/util";
import urljoin from "url-join";
import {
  UpgradeUserWithV4CommitmentRequest,
  UpgradeUserWithV4CommitmentResponseValue
} from "../RequestTypes";
import { APIResult } from "./apiResult";
import { httpPostSimple } from "./makeRequest";

/**
 * Asks the Zupass server to add a semaphore v4 commitment to the user's account, given
 * they already have an account with just a v3 identity.
 *
 * Idempotent.
 *
 * @see {@link makeUpgradeUserWithV4CommitmentRequest} for details regarding what this request contains.
 *
 * Never rejects. All information encoded in the resolved response.
 */
export async function requestUpgradeUserWithV4Commitment(
  zupassServerUrl: string,
  req: UpgradeUserWithV4CommitmentRequest
): Promise<UpgradeUserWithV4CommitmentResult> {
  return httpPostSimple(
    urljoin(zupassServerUrl, "/account/upgrade-with-v4-commitment"),
    async () => ({
      value: undefined,
      success: true
    }),
    req
  );
}

export type UpgradeUserWithV4CommitmentResult =
  APIResult<UpgradeUserWithV4CommitmentResponseValue>;

/**
 * @returns a v3 signature of a v4 signature of the identity commitment of the identity that
 * was used to create the outermost v3 signature. Expects that both a v3 and v4 identity PCD
 * exist in the collection. This proves that the creator of this request 'owns' both identities.
 */
export async function makeUpgradeUserWithV4CommitmentRequest(
  pcdCollection: PCDCollection
): Promise<UpgradeUserWithV4CommitmentRequest> {
  const identity = pcdCollection.getPCDsByType(
    SemaphoreIdentityPCDPackage.name
  )[0] as SemaphoreIdentityPCD | undefined;

  if (!identity) {
    throw new Error(
      "Expected a semaphore identity to be present in the PCD collection"
    );
  }

  const v4SigOfV3Claim = await PODPCDPackage.prove({
    entries: {
      argumentType: ArgumentTypeName.Object,
      value: podEntriesToJSON({
        mySemaphoreV3Commitment: {
          type: "cryptographic",
          value: identity.claim.identityV3.commitment
        },
        pod_type: {
          type: "string",
          value: "zupass_semaphore_v4_migration"
        }
      })
    },
    privateKey: {
      argumentType: ArgumentTypeName.String,
      value: v4PrivateKey(identity.claim.identityV4)
    },
    id: {
      argumentType: ArgumentTypeName.String,
      value: randomUUID()
    }
  });

  const v3SigOfV4Sig = await SemaphoreSignaturePCDPackage.prove({
    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(identity)
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

/**
 * @param sig created by {@link makeUpgradeUserWithV4CommitmentRequest}. This function verifies that it
 * is a valid v3 signature of a valid v4 signature of the identity that was used to create
 * the outermost v3 signature.
 */
export async function verifyAddV4CommitmentRequestPCD(
  sig: SemaphoreSignaturePCD
): Promise<V4MigrationVerification | undefined> {
  try {
    const v3SigVerifies = await SemaphoreSignaturePCDPackage.verify(sig);
    const expectedV3Id = BigInt(sig.claim.identityCommitment);
    const v4SigOfV3Id = await PODPCDPackage.deserialize(
      JSON.parse(sig.claim.signedMessage).pcd
    );
    const v4SigVerifies = await PODPCDPackage.verify(v4SigOfV3Id);
    const v4Message = v4SigOfV3Id.claim.entries["mySemaphoreV3Commitment"];
    const v4SigIsOfV3Id =
      v4Message.type === "cryptographic" && v4Message.value === expectedV3Id;
    const isRightPodType =
      v4SigOfV3Id.claim.entries["pod_type"]?.type === "string" &&
      v4SigOfV3Id.claim.entries["pod_type"].value ===
        "zupass_semaphore_v4_migration";
    if (v3SigVerifies && v4SigVerifies && v4SigIsOfV3Id && isRightPodType) {
      return {
        v3Commitment: expectedV3Id.toString(),
        v4PublicKey: v4SigOfV3Id.claim.signerPublicKey,
        v4Commitment: v4PublicKeyToCommitment(v4SigOfV3Id.claim.signerPublicKey)
      };
    }
    return undefined;
  } catch (e) {
    return undefined;
  }
}

export interface V4MigrationVerification {
  v3Commitment: string;
  v4PublicKey: string;
  v4Commitment: string;
}
