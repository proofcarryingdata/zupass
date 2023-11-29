pragma circom 2.1.4;

include "../../../node_modules/circomlib/circuits/poseidon.circom";
include "../../../node_modules/circomlib/circuits/eddsaposeidon.circom";

// Helper template for revealed fields. out will be set to value or to -1 if
// not revealed.
// The shouldRevealValue input is assumed (but not constrained) to be 0 or 1.
// Should be constrained externally.
template ValueOrNegativeOne() {
    signal input value;
    signal input shouldRevealValue; // assumed to be 0 or 1

    signal output out;

    out <== value * shouldRevealValue + (-1) * (1 - shouldRevealValue);
}

// Claim being proved:
// 1. The frog data is signed by a signer with the specified EdDSA pubkey.
// 2. The owner owns the frog: the owner's semaphore identity matches the
// frog's ownerSemaphoreId.
// 3. Additionally a nullfier is calculated, and a watermark is included
// (unmodified).
// 4. Configuration options can determine which of the frog and nullifier
// fields are revealed publicly.
template ZKEdDSAFrogPCD () {
    // Fields representing a frog
    signal input frogId;
    signal input revealFrogId;

    signal input biome;
    signal input revealBiome;

    signal input rarity;
    signal input revealRarity;

    signal input temperament;
    signal input revealTemperament;

    signal input jump;
    signal input revealJump;

    signal input speed;
    signal input revealSpeed;

    signal input intelligence;
    signal input revealIntelligence;

    signal input beauty;
    signal input revealBeauty;

    signal input timestampSigned;
    signal input revealTimestampSigned;

    signal input ownerSemaphoreId;
    signal input revealOwnerSemaphoreId;

    // reserved fields
    signal input reservedField1;
    signal input revealReservedField1;

    signal input reservedField2;
    signal input revealReservedField2;

    signal input reservedField3;
    signal input revealReservedField3;

    // Signer of the frog: EdDSA public key
    signal input frogSignerPubkeyAx;
    signal input frogSignerPubkeyAy;

    // Signature of the frog: EdDSA signaure
    signal input frogSignatureR8x;
    signal input frogSignatureR8y;
    signal input frogSignatureS;

    // Owner's Semaphore identity
    signal input semaphoreIdentityNullifier;
    signal input semaphoreIdentityTrapdoor;

    // External nullifier, used to tie together nullifiers within a single category. 
    signal input externalNullifier;

    // Whether to reveal the nullifier hash, which can be used to tie together
    // different proofs from the same semaphore ID.
    signal input revealNullifierHash;

    // Watermark allows prover to tie a proof to a challenge. It's unconstrained,
    // but included in the proof.
    signal input watermark;

    // Verify all revealX values are 1 or 0
    revealFrogId * (1 - revealFrogId) === 0;
    revealBiome * (1 - revealBiome) === 0;
    revealRarity * (1 - revealRarity) === 0;
    revealTemperament * (1 - revealTemperament) === 0;
    revealJump * (1 - revealJump) === 0;
    revealSpeed * (1 - revealSpeed) === 0;
    revealIntelligence * (1 - revealIntelligence) === 0;
    revealBeauty * (1 - revealBeauty) === 0;
    revealTimestampSigned * (1 - revealTimestampSigned) === 0;
    revealOwnerSemaphoreId * (1 - revealOwnerSemaphoreId) === 0;
    revealReservedField1 * (1 - revealReservedField1) === 0;
    revealReservedField2 * (1 - revealReservedField2) === 0;
    revealReservedField3 * (1 - revealReservedField3) === 0;
    revealNullifierHash * (1 - revealNullifierHash) === 0;

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
    signal nullifierHash <== Poseidon(2)([externalNullifier, semaphoreIdentityNullifier]);

    // Dummy constraint on watermark to make sure it can't be compiled out.
    signal watermarkSquared <== watermark * watermark;

    // Revealed frog fields get either the value or -1 based on configuration.
    signal output revealedFrogId <== ValueOrNegativeOne()(frogId, revealFrogId);
    signal output revealedBiome <== ValueOrNegativeOne()(biome, revealBiome);
    signal output revealedRarity <== ValueOrNegativeOne()(rarity, revealRarity);
    signal output revealedTemperament <== ValueOrNegativeOne()(temperament, revealTemperament);
    signal output revealedJump <== ValueOrNegativeOne()(jump, revealJump);
    signal output revealedSpeed <== ValueOrNegativeOne()(speed, revealSpeed);
    signal output revealedIntelligence <== ValueOrNegativeOne()(intelligence, revealIntelligence);
    signal output revealedBeauty <== ValueOrNegativeOne()(beauty, revealBeauty);
    signal output revealedTimestampSigned <== ValueOrNegativeOne()(timestampSigned, revealTimestampSigned);
    signal output revealedOwnerSemaphoreId <== ValueOrNegativeOne()(ownerSemaphoreId, revealOwnerSemaphoreId);
    signal output revealedReservedField1 <== ValueOrNegativeOne()(reservedField1, revealReservedField1);
    signal output revealedReservedField2 <== ValueOrNegativeOne()(reservedField2, revealReservedField2);
    signal output revealedReservedField3 <== ValueOrNegativeOne()(reservedField3, revealReservedField3);

    // Revealed nullifier gets either the value or -1 based on configuration.
    signal output revealedNullifierHash <== ValueOrNegativeOne()(nullifierHash, revealNullifierHash);
}

component main { public [ frogSignerPubkeyAx, frogSignerPubkeyAy, externalNullifier, watermark ] } = ZKEdDSAFrogPCD();
