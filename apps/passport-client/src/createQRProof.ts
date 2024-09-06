import { ArgumentTypeName } from "@pcd/pcd-types";
import {
  IdentityV3,
  SemaphoreIdentityPCDPackage
} from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage
} from "@pcd/semaphore-signature-pcd";
import { uuidToBigint } from "./util";

export interface QRPayload {
  uuid: string;
  timestamp: number;
}

// Create a PCD proving that we own a given semaphore identity.
export async function createQRProof(
  identityV3: IdentityV3,
  uuid: string,
  timestamp: number
): Promise<SemaphoreSignaturePCD> {
  const { prove } = SemaphoreSignaturePCDPackage;

  const payload: QRPayload = {
    uuid: uuidToBigint(uuid).toString(),
    timestamp
  };

  const args: SemaphoreSignaturePCDArgs = {
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: JSON.stringify(payload)
    },
    identity: {
      argumentType: ArgumentTypeName.PCD,
      pcdType: SemaphoreIdentityPCDPackage.name,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identityV3 })
      )
    }
  };

  const pcd = await prove(args);
  return pcd;
}
