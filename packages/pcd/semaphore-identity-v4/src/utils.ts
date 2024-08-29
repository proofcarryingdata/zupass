import {
  encodePrivateKey,
  encodePublicKey,
  podEdDSAPublicKeyHash
} from "@pcd/pod";
import { SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { Identity } from "@semaphore-protocol/identity";
import { beBigIntToBuffer } from "@zk-kit/utils";
import { sha256 } from "js-sha256";
import { SemaphoreIdentityV4PCD } from "./SemaphoreIdentityV4PCD";

/**
 * Given a semaphore v4 public key, returns the corresponding v4 identity commitment.
 */
export function v4PublicKeyToCommitment(publicKey: string): string {
  return podEdDSAPublicKeyHash(publicKey).toString();
}

/**
 * Given a semaphore v4 identity, returns it's EdDSA public key as a base64 encoded string.
 */
export function v4PublicKey(identity: Identity): string {
  return encodePublicKey(identity.publicKey);
}

/**
 * Given a semaphore v4 identity, returns it's EdDSA private key as a base64 encoded string.
 */
export function v4PrivateKey(identity: Identity): string {
  return encodePrivateKey(Buffer.from(identity.export(), "base64"));
}

/**
 * Deterministic migration from a v3 to a v4 semaphore identity. Not reversible.
 */
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
