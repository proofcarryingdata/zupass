include "circomlib/circuits/poseidon.circom";
include "gpc-util.circom";

/**
 * Module for establishing ownership of a POD object by the holder of a
 * Semaphore V3 identity.  The owner is identified by identityCommitment, which
 * should externally constrained to an entry of an object.
 * 
 * Optionally calculates a nullifer tied to the owner's identity.  The revealed
 * nullifier will be set to -1 if unused.
 * 
 * This module can be disabled entirely using the `enabled` signal, in which case all
 * inputs are unconstrained.
 *
 * Boolean signals are assumed (but not constrained) to be 0 or 1.
 * They will usually be implicitly constrained when they are unpacked using
 * Num2Bits.
 */
template OwnerModuleSemaphoreV3 () {
    // Global flag to enable or disable ownership constraints.
    signal input enabled;
    // Constrained externally: enabled * (1 - enabled) === 0;

    // Owner's Semaphore V3 identity (private key) kept hidden and verified.
    signal input identityNullifier, identityTrapdoor;

    // Owner's identity commitment (public) to be verified.
    signal input identityCommitment;

    // Verify semaphore private identity matches the ID in the ticket by
    // re-generating the public ID to compare.
    signal semaSecret <== Poseidon(2)([
        identityNullifier,
        identityTrapdoor
    ]);
    signal semaIDCommitment <== Poseidon(1)([semaSecret]);
    (identityCommitment - semaIDCommitment) * enabled === 0;

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
