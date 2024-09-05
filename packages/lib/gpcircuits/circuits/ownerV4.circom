pragma circom 2.1.8;

include "circomlib/circuits/babyjub.circom";
include "circomlib/circuits/comparators.circom";
include "circomlib/circuits/poseidon.circom";
include "gpc-util.circom";

/**
 * Module for establishing ownership of a POD object by the holder of
 * a Semaphore V4 identity.  The owner is identified by their EdDSA
 * public key, which should be externally constrained to an entry of
 * an object.  Ownership is proven by presenting the secret scalar
 * (derivable from the corresponding private key) as a private input.
 * 
 * Optionally calculates a nullifer tied to the owner's identity.  The
 * revealed nullifier will be set to -1 if unused.
 * 
 * This module can be disabled entirely using the `enabled` signal, in
 * which case all inputs are unconstrained.
 *
 * Boolean signals are assumed (but not constrained) to be 0 or 1.
 * They will usually be implicitly constrained when they are unpacked
 * using Num2Bits.
 */
template OwnerModuleSemaphoreV4 () {
    // Global flag to enable or disable ownership constraints.
    signal input enabled;
    // Constrained externally: enabled * (1 - enabled) === 0;

    // Secret scalar of owner's Semaphore V4 identity kept hidden and
    // verified.
    signal input secretScalar;

    // Owner's identity commitment (public key hash) to be verified.
    signal input identityCommitment;

    // First step of check that `secretScalar` does not exceed the
    // order of Baby Jubjub's prime subgroup. Note that a second
    // bounds check is contained in the call to `BabyPbk()` below, and
    // both ensure that 0 <= secretScalar < subgroupOrder.
    var subgroupOrder = 2736030358979909402780800718157159386076813972158567259200215660948447373041;
    signal upperBoundCheck <== LessThan(251)([secretScalar, subgroupOrder]);
    upperBoundCheck === 1;
    
    // Verify semaphore private secrets match the commitment in the POD by
    // re-generating the public commitment to compare.
    signal (computedPublicKeyX, computedPublicKeyY) <== BabyPbk()(secretScalar);
    signal computedIdentityCommitment <== Poseidon(2)([computedPublicKeyX, computedPublicKeyY]);

    (computedIdentityCommitment - identityCommitment) * enabled === 0;

    // External nullifier, used to tie together nullifiers within a single category. 
    signal input externalNullifier;

    // Calculate nullifier (privately).
    signal nullifierHash <== Poseidon(2)([externalNullifier, secretScalar]);

    // Input specifies whether to reveal the nullifier hash, which can be used to tie together
    // different proofs from the same semaphore ID.
    signal input isNullifierHashRevealed;
    // Checked by Num2Bits externally: isNullifierHashRevealed * (1 - isNullifierHashRevealed) === 0;

    // Revealed nullifier gets either the value or -1 based on configuration.
    signal shouldRevealNullifierHash <== isNullifierHashRevealed * enabled;
    signal output revealedNullifierHash <== ValueOrNegativeOne()(nullifierHash, shouldRevealNullifierHash);
}
