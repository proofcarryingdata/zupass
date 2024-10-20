import { SerializedPCD } from "@pcd/pcd-types";
import { PODPCD, PODPCDPackage, PODPCDTypeName } from "@pcd/pod-pcd";
import { getErrorMessage } from "@pcd/util";

export async function mintPODPCD(
  mintUrl: string,
  podPCDTemplate: SerializedPCD<PODPCD>,
  semaphoreSignaturePCD: SerializedPCD
): Promise<SerializedPCD<PODPCD>> {
  // Request POD by content ID.
  const templatePCD = (await PODPCDPackage.deserialize(
    podPCDTemplate.pcd
  )) as PODPCD;
  const contentID = templatePCD.pod.contentID.toString(16);
  const requestBody = JSON.stringify({
    contentID,
    semaphoreSignaturePCD
  });
  let mintResultText: string;
  let serializedMintedPODPCD: SerializedPCD<PODPCD>;
  let mintedPCD: PODPCD;

  try {
    const resp = await fetch(mintUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: requestBody
    });
    mintResultText = await resp.text();
    if (!resp.ok) {
      throw new Error(`${resp.status}: ${mintResultText}`);
    }
  } catch (e) {
    throw new Error(`Mint server error: ${getErrorMessage(e)}`);
  }

  try {
    serializedMintedPODPCD = JSON.parse(
      mintResultText
    ) as SerializedPCD<PODPCD>;

    if (serializedMintedPODPCD.type !== PODPCDTypeName) {
      throw new Error(
        `Serialized PODPCD has wrong type ${serializedMintedPODPCD.type}`
      );
    }

    mintedPCD = (await PODPCDPackage.deserialize(
      serializedMintedPODPCD.pcd
    )) as PODPCD;
  } catch (e) {
    console.error(
      `Invalid minted PODPCD ${getErrorMessage(
        e
      )}.\nContents: ${mintResultText}`
    );
    throw new Error("Invalid mint request!");
  }

  // Throw if signer's keys don't match.
  if (templatePCD.claim.signerPublicKey !== mintedPCD.claim.signerPublicKey) {
    throw new Error("The minted POD was signed by a different party.");
  }

  return serializedMintedPODPCD;
}
