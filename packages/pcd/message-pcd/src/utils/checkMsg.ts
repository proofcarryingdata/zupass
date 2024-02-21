import { EdDSAPublicKey, isEqualEdDSAPublicKey } from "@pcd/eddsa-pcd";
import { MessagePCD, MessagePCDPackage } from "../MessagePCD";

export async function checkMsg(
  msg: MessagePCD,
  expectedKey: EdDSAPublicKey
): Promise<void> {
  if (
    !isEqualEdDSAPublicKey(expectedKey, msg.proof.signature.claim.publicKey)
  ) {
    throw new Error(
      `eddsa signature mismatch. expected ${JSON.stringify(
        expectedKey
      )} but got ${JSON.stringify(msg.proof.signature.claim.publicKey)}`
    );
  }

  const verified = await MessagePCDPackage.verify(msg);

  if (!verified) {
    throw new Error(
      "PCD not verified: " +
        JSON.stringify(await MessagePCDPackage.serialize(msg))
    );
  }
}
