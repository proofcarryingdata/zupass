import {
  ProveRequest,
  ProveResponse,
  SupportedPCDsResponse,
  VerifyRequest,
  VerifyResponse,
} from "@pcd/passport-interface";
import { PCDPackage } from "@pcd/pcd-types";
import { SemaphoreGroupPCDPackage } from "@pcd/semaphore-group-pcd";
import path from "path";

/**
 * Each PCD type that the proving server supports has to go into this array,
 * and be initialized properly based on where its artifacts live.
 */
const packages: PCDPackage[] = [SemaphoreGroupPCDPackage];

export async function initPackages() {
  const fullPath = path.join(__dirname, "../semaphore-artifacts");

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

export async function prove(
  proveRequest: ProveRequest
): Promise<ProveResponse> {
  const pcdPackage = getPackage(proveRequest.pcdType);
  const pcd = await pcdPackage.prove(proveRequest.args);
  const serializedPCD = await pcdPackage.serialize(pcd);

  return {
    serializedPCD: JSON.stringify(serializedPCD),
  };
}

export async function verify(
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
