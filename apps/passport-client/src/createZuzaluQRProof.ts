import { ArgumentTypeName } from "@pcd/pcd-types";
import { SemaphoreIdentityPCDPackage } from "@pcd/semaphore-identity-pcd";
import {
  SemaphoreSignaturePCD,
  SemaphoreSignaturePCDArgs,
  SemaphoreSignaturePCDPackage,
} from "@pcd/semaphore-signature-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { uuidToBigint } from "./util";

// Create a PCD proving that we own a given semaphore identity.
export async function createZuzaluQRProof(
  identity: Identity,
  uuid: string
): Promise<SemaphoreSignaturePCD> {
  const { prove } = SemaphoreSignaturePCDPackage;

  const args: SemaphoreSignaturePCDArgs = {
    signedMessage: {
      argumentType: ArgumentTypeName.String,
      value: uuidToBigint(uuid).toString(),
    },

    identity: {
      argumentType: ArgumentTypeName.PCD,
      value: await SemaphoreIdentityPCDPackage.serialize(
        await SemaphoreIdentityPCDPackage.prove({ identity })
      ),
    },
  };

  const pcd = await prove(args);
  return pcd;
}
