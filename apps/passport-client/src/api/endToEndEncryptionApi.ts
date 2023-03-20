import { Identity } from "@semaphore-protocol/identity";
import { EncryptedPacket } from "passport-crypto";
import { PASSPORT_SERVER_URL } from "../urls";

export async function downloadEncryptedPCDs(
  identity: Identity
): Promise<EncryptedPacket> {
  const response = await fetch(
    PASSPORT_SERVER_URL +
      "/user/fetch/?" +
      new URLSearchParams({
        identityCommitment: this.identity.commitment.toString(),
      })
  );

  const res = await response.json();
  return res as EncryptedPacket;
}

export async function uploadEncryptedPCDs(
  identity: Identity,
  encryptedPCDs: EncryptedPacket
): Promise<void> {
  await fetch(PASSPORT_SERVER_URL + "/user/write/", {
    method: "POST",
    body: JSON.stringify({
      identityCommitment: identity.commitment.toString(),
      encryptedPCDs: JSON.stringify(encryptedPCDs),
    }),
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json",
    },
  });
}
