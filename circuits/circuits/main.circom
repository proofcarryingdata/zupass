// pragma circom 2.0.6;

include "../../circom-merkle/circuits/merkle.circom";

component main { public [ root ] } = MerkleTreeChecker(30);
