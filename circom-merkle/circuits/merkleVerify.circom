pragma circom 2.0.3;

include "../node_modules/circomlib/circuits/poseidon.circom";
include "./merkleTree.circom";

template MerkleVerify(n, k, levels) {
    signal input modulus[k];
    signal input root;
    signal input pathElements[levels];
    signal input pathIndices[levels];
    signal leaf;

    component leafPoseidonK = PoseidonK(k);
    for (var i = 0; i < k; i++) {
        leafPoseidonK.inputs[i] <== modulus[i];
    }
    leaf <== leafPoseidonK.out;

    component merkleChecker = MerkleTreeChecker(levels);
    merkleChecker.leaf <== leaf;
    merkleChecker.root <== root;
    for (var i = 0; i < levels; i++) {
        merkleChecker.pathElements[i] <== pathElements[i];
        merkleChecker.pathIndices[i] <== pathIndices[i];
    }
}
