import { decodePublicKey, encodePrivateKey, encodePublicKey } from "@pcd/pod";
import { IdentityV3, SemaphoreIdentityPCD } from "@pcd/semaphore-identity-pcd";
import { beBigIntToBuffer } from "@zk-kit/utils";
import { sha256 } from "js-sha256";
import { poseidon2 } from "poseidon-lite/poseidon2";
import { SemaphoreIdentityV4PCD } from "./SemaphoreIdentityV4PCD";
import { IdentityV4 } from "./forwardedTypes";

/**
 * Given a semaphore v4 public key, returns the corresponding v4 identity commitment.
 */
export function v4PublicKeyToCommitment(publicKey: string): string {
  // matches implementation in semaphore v4 lib:
  // https://github.com/semaphore-protocol/semaphore/blob/3572f44/packages/identity/src/index.ts#L49
  return poseidon2(decodePublicKey(publicKey)).toString();
}

/**
 * Given a semaphore v4 identity, returns it's EdDSA public key as a base64 encoded string.
 */
export function v4PublicKey(identity: IdentityV4): string {
  return encodePublicKey(identity.publicKey);
}

/**
 * Given a semaphore v4 identity, returns it's EdDSA private key as a base64 encoded string.
 */
export function v4PrivateKey(identity: IdentityV4): string {
  return encodePrivateKey(Buffer.from(identity.export(), "base64"));
}

/**
 * Deterministic migration from a v3 to a v4 semaphore identity. Not reversible.
 */
export function v3tov4IdentityPCD(
  v3Identity: SemaphoreIdentityPCD
): SemaphoreIdentityV4PCD {
  return new SemaphoreIdentityV4PCD(v3Identity.id + "-v4", {
    identity: v3tov4Identity(v3Identity.claim.identity)
  });
}

/**
 * Deterministic migration from a v3 to a v4 semaphore identity. Not reversible.
 */
export function v3tov4Identity(v3Identity: IdentityV3): IdentityV4 {
  const hashInput = Buffer.from(
    beBigIntToBuffer(v3Identity.nullifier, 32).toString("hex") +
      beBigIntToBuffer(v3Identity.trapdoor, 32).toString("hex"),
    "hex"
  );
  const privKey = Buffer.from(sha256(hashInput), "hex");
  return new IdentityV4(privKey);
}
