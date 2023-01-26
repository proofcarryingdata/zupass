pragma circom 2.0.6;


include "./packages/efficient-zk-sig/circuits/ecdsa_verify_pubkey_to_addr.circom";
include "./merkle.circom";

// d - merkle tree depth
template SetMembership(d) {
    signal input publicKey;
    
    component verifyMerkleProof = MerkleTreeChecker(d);

    verifyMerkleProof.leaf <== address;
    verifyMerkleProof.root <== root;

    for (var i = 0; i < d; i++) {
        verifyMerkleProof.pathElements[i] <== pathElements[i];
        verifyMerkleProof.pathIndices[i] <== pathIndices[i];
    }
}

component main { public [root, propId, groupType, TPreComputes, U] } = SetMembership(64, 4, 30);
