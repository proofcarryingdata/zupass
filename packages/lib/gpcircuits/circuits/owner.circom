pragma circom 2.1.8;

include "circomlib/circuits/poseidon.circom";
include "gpc-util.circom";

/**
 * Module for establishing ownership of a POD object by the holder of a
 * Semaphore V3 identity.  The owner is identified by identityCommitment, which
 * should externally constrained to an entry of an object.  Ownership is
 * proven by presenting the identity private secrets (trapdoor and nullifier)
 * as private inputs.
 * 
 * Optionally calculates a nullifer tied to the owner's identity.  The revealed
 * nullifier will be set to -1 if unused.
 * 
 * This module can be disabled entirely using the `enabled` signal, in which
 * case all inputs are unconstrained.
 *
 * Boolean signals are assumed (but not constrained) to be 0 or 1.
 * They will usually be implicitly constrained when they are unpacked using
 * Num2Bits.
 */
template OwnerModuleSemaphoreV3 () {
    // Global flag to enable or disable ownership constraints.
    signal input enabled;
    // Constrained externally: enabled * (1 - enabled) === 0;

    // Private secrets of owner's Semaphore V3 identity kept hidden and verified.
    signal input identityNullifier, identityTrapdoor;

    // Hash of owner's identity commitment (public) to be verified.
    signal input identityCommitmentHash;

    // Verify semaphore private secrets match the commitment in the POD by
    // re-generating the public commitment to compare.
    signal semaSecretHash <== Poseidon(2)([
        identityNullifier,
        identityTrapdoor
    ]);
    signal semaIDCommitment <== Poseidon(1)([semaSecretHash]);
    signal semaIDCommitmentHash <== Poseidon(1)([semaIDCommitment]);

    (identityCommitmentHash - semaIDCommitmentHash) * enabled === 0;

    // External nullifier, used to tie together nullifiers within a single category. 
    signal input externalNullifier;

    // Calculate nullifier (privately).
    signal nullifierHash <== Poseidon(2)([externalNullifier, identityNullifier]);

    // Input specifies whether to reveal the nullifier hash, which can be used to tie together
    // different proofs from the same semaphore ID.
    signal input isNullfierHashRevealed;
    // Checked by Num2Bits externally: isNullfierHashRevealed * (1 - isNullfierHashRevealed) === 0;

    // Revealed nullifier gets either the value or -1 based on configuration.
    signal shouldRevealNullifierHash <== isNullfierHashRevealed * enabled;
    signal output revealedNullifierHash <== ValueOrNegativeOne()(nullifierHash, shouldRevealNullifierHash);
}
