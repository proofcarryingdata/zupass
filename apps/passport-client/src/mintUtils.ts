import { SerializedPCD } from "@pcd/pcd-types";
import { POD } from "@pcd/pod";
import { PODPCD, PODPCDPackage } from "@pcd/pod-pcd";

export async function mintPODPCD(
  mintUrl: string,
  podPCDTemplate: SerializedPCD<PODPCD>,
  semaphoreSignaturePCD: SerializedPCD
): Promise<SerializedPCD<PODPCD>> {
  // Request POD by content ID.
  const pcd = (await PODPCDPackage.deserialize(podPCDTemplate.pcd)) as PODPCD;
  const contentID = pcd.pod.contentID.toString(16);
  const requestBody = JSON.stringify({
    contentID,
    semaphoreSignaturePCD
  });
  let mintedPOD: POD;
  let serialisedMintedPOD: string;

  try {
    const resp = await fetch(mintUrl, {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Content-Type": "application/json"
      },
      body: requestBody
    });
    serialisedMintedPOD = await resp.text();
  } catch {
    throw new Error("Mint server error.");
  }

  try {
    mintedPOD = POD.deserialize(serialisedMintedPOD);
  } catch {
    throw new Error("Invalid mint request!");
  }

  // Throw if signer's keys don't match.
  if (pcd.claim.signerPublicKey !== mintedPOD.signerPublicKey) {
    throw new Error("The minted POD was signed by a different party.");
  }

  const mintedPCD = new PODPCD(pcd.id, mintedPOD);
  return PODPCDPackage.serialize(mintedPCD);
}
