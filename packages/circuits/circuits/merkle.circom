pragma circom 2.0.6;

include "../../../node_modules/circomlib/circuits/poseidon.circom";

// if s == 0 returns [in[0], in[1]]
// if s == 1 returns [in[1], in[0]]
template DualMux() {
  signal input in[2];
  signal input s;
  signal output out[2];

  s * (1 - s) === 0;
  out[0] <== (in[1] - in[0])*s + in[0];
  out[1] <== (in[0] - in[1])*s + in[1];
}

// Verifies that merkle proof is correct for given merkle root and a leaf
// pathIndices input is an array of 0/1 selectors telling whether given pathElement is on the left or right side of merkle path
template MerkleTreeChecker(levels) {
  signal input leaf;
  signal input root;
  signal input pathElements[levels];
  signal input pathIndices[levels];

  component selectors[levels];
  component hashers[levels];

  signal zeroCheckers[levels+1];
  zeroCheckers[0] <== leaf - root;

  for (var i = 0; i < levels; i++) {
      selectors[i] = DualMux();
      selectors[i].in[0] <== i == 0 ? leaf : hashers[i - 1].out;
      selectors[i].in[1] <== pathElements[i];
      selectors[i].s <== pathIndices[i];

      hashers[i] = Poseidon(2);
      hashers[i].inputs[0] <== selectors[i].out[0];
      hashers[i].inputs[1] <== selectors[i].out[1];
      zeroCheckers[i+1] <== zeroCheckers[i] * (hashers[i].out - root);
  }

  zeroCheckers[levels] === 0;
}