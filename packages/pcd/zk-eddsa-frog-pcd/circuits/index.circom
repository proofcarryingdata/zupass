pragma circom 2.1.4;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/eddsaposeidon.circom";

// Claim being proved:
// 1. The owner owns the frog: the owner's semaphore identity matches the
// frog's ownerSemaphoreId. And the owner's identity will be kept private.
// 2. The frog data is signed by a signer with the specified EdDSA pubkey.
// 3. Additionally a nullfier is calculated.
template EdDSAFrogPCD () {
    // Fields representing a frog
    signal input frogId;
    signal input biome;
    signal input rarity;
    signal input temperament;
    signal input jump;
    signal input speed;
    signal input intelligence;
    signal input beauty;
    signal input timestampSigned;
    signal input ownerSemaphoreId;
    // reserved fields
    signal input reservedField1;
    signal input reservedField2;
    signal input reservedField3;

    // Signer of the frog: EdDSA public key
    signal input frogSignerPubkeyAx;
    signal input frogSignerPubkeyAy;

    // Signature of the frog: EdDSA signaure
    signal input frogSignatureR8x;
    signal input frogSignatureR8y;
    signal input frogSignatureS;

    // Owner's Semaphore identity, private
    signal input semaphoreIdentityNullifier;
    signal input semaphoreIdentityTrapdoor;

    // External nullifier, used to tie together nullifiers within a single category. 
    signal input externalNullifier;

    // Watermark allows prover to tie a proof to a challenge. It's unconstrained,
    // but included in the proof.
    signal input watermark;

    // Calculate "message" representing the frog, which is a hash of the fields.
    signal frogMessageHash <== Poseidon(13)([
        frogId,
        biome,
        rarity,
        temperament,
        jump,
        speed,
        intelligence,
        beauty,
        timestampSigned,
        ownerSemaphoreId,
        reservedField1,
        reservedField2,
        reservedField3
    ]);

    // Verify frog signature
    EdDSAPoseidonVerifier()(
        1,
        frogSignerPubkeyAx,
        frogSignerPubkeyAy,
        frogSignatureS,
        frogSignatureR8x,
        frogSignatureR8y,
        frogMessageHash
    );

    // Verify semaphore private identity matches the frog owner semaphore ID.
    signal semaphoreSecret <== Poseidon(2)([
        semaphoreIdentityNullifier,
        semaphoreIdentityTrapdoor
    ]);
    signal semaphoreIdentityCommitment <== Poseidon(1)([semaphoreSecret]);
    ownerSemaphoreId === semaphoreIdentityCommitment;

    // Calculate nullifier
    signal output nullifierHash <== Poseidon(2)([externalNullifier, semaphoreIdentityNullifier]);

    // Dummy constraint on watermark to make sure it can't be compiled out.
    signal watermarkSquared <== watermark * watermark;
}

component main { public [
    frogId,
    biome,
    rarity,
    temperament,
    jump,
    speed,
    intelligence,
    beauty,
    timestampSigned,
    ownerSemaphoreId,
    reservedField1,
    reservedField2,
    reservedField3,
    frogSignerPubkeyAx,
    frogSignerPubkeyAy,
    externalNullifier,
    watermark
] } = EdDSAFrogPCD();
