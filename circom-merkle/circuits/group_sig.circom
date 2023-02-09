pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./merkle.circom";

template RSAGroupSigVerify(n, k, levels) {
    signal input modulus[k];

    component merkleChecker = MerkleTreeChecker(levels);
    signal leaf;
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];

    // connect the two components; modulus (n x k bigint representation) must hash to leaf
    component leafPoseidonK = PoseidonK(k);
    for (var i = 0; i < k; i++) {
        leafPoseidonK.inputs[i] <== modulus[i];
    }
    leaf <== leafPoseidonK.out;
    merkleChecker.leaf <== leaf;
    merkleChecker.root <== root;
    for (var i = 0; i < levels; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }
}
