import {
  encodePrivateKey,
  encodePublicKey,
  podEdDSAPublicKeyHash
} from "@pcd/pod";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { derivePublicKey } from "@zk-kit/eddsa-poseidon";
import { beBigIntToBuffer } from "@zk-kit/utils";
import { sha256 } from "js-sha256";
import { SemaphoreIdentityV4PCD } from "./SemaphoreIdentityV4PCD";

export function v4PublicKeyToCommitment(publicKey: string): string {
  return podEdDSAPublicKeyHash(publicKey).toString();
}

export function v4PublicKey(identity: Identity): string {
  const unpackedPublicKey = derivePublicKey(
    Buffer.from(identity.export(), "base64")
  );
  const publicKey = encodePublicKey(unpackedPublicKey);
  return publicKey;
}

export function v4PrivateKey(identity: Identity): string {
  return encodePrivateKey(Buffer.from(identity.export(), "base64"));
}

export function v3tov4Identity(
  v3Identity: SemaphoreIdentityPCD
): SemaphoreIdentityV4PCD {
  const v3 = v3Identity.claim.identity;
  const hashInput = Buffer.from(
    beBigIntToBuffer(v3.nullifier, 32).toString("hex") +
      beBigIntToBuffer(v3.trapdoor, 32).toString("hex"),
    "hex"
  );
  const privKey = Buffer.from(sha256(hashInput), "hex");
  const identity = new Identity(privKey);
  return new SemaphoreIdentityV4PCD(v3Identity.id + "-v4", {
    identity
  });
}
