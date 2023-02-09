include "./merkleVerify.circom";

component main { public [ root ] } = MerkleTreeChecker(30);
