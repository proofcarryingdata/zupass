import {
  ProveRequest,
  ProveResponse,
  SupportedPCDsResponse,
  VerifyRequest,
  VerifyResponse,
} from "passport-interface";
import { PCDPackage } from "pcd-types";
import { SemaphoreGroupPCDPackage } from "semaphore-group-pcd";

/**
 * Each PCD type that the proving server supports has to go into this array.
 */
const packages: PCDPackage[] = [SemaphoreGroupPCDPackage];

function getPackage(name: string) {
  const matching = packages.find((p) => p.name === name);

  if (matching === undefined) {
    throw new Error(`no package matching ${name}`);
  }

  return matching;
}

export async function prove(
  proveRequest: ProveRequest
): Promise<ProveResponse> {
  const pcdPackage = getPackage(proveRequest.pcdType);
  const pcd = await pcdPackage.prove(proveRequest.args);
  const serializedPCD = await pcdPackage.serialize(pcd);

  return {
    serializedPCD,
  };
}

export async function verify(
  verifyRequest: VerifyRequest
): Promise<VerifyResponse> {
  const pcdPackage = getPackage(verifyRequest.pcdType);
  const deserialized = await pcdPackage.deserialize(
    verifyRequest.serializedPCD
  );
  const verified = await pcdPackage.verify(deserialized);
  return { verified };
}

export function getSupportedPCDTypes(): SupportedPCDsResponse {
  return {
    names: packages.map((p) => p.name),
  };
}
