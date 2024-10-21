pragma circom 2.1.8;

include "circomlib/circuits/eddsaposeidon.circom";

/**
 * Module constraining a single POD object.  This module proves that the
 * object's contentID (Merkle tree root) was signed by an issuer's key.
 * 
 * This module's functionality is always enabled.  Unused modules can be
 * populated with duplicate constraint-satisfying values from used modules.
 */
template ObjectModule () {
    // Root hash of the object's Merkle tree representation
    signal input contentID;

    // Signer of ticket: EdDSA public key
    signal input signerPubkeyAx, signerPubkeyAy;

    // Signature of ticket: EdDSA signaure
    signal input signatureR8x, signatureR8y, signatureS;

    // Verify signature
    EdDSAPoseidonVerifier()(
        enabled <== 1,
        Ax <== signerPubkeyAx,
        Ay <== signerPubkeyAy,
        S <== signatureS,
        R8x <== signatureR8x,
        R8y <== signatureR8y,
        M <== contentID
    );
}
