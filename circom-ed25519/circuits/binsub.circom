pragma circom 2.0.0;

include "binadd.circom";

template BinSub(nBits) {
  signal input in[2][nBits];
  signal output out[nBits];

  var i;
  component add1ToFlipped = BinAdd(nBits);

  add1ToFlipped.in[0][0] <== 1 + in[1][0] - 2*in[1][0];
  add1ToFlipped.in[1][0] <== 1;
  for (i=1; i<nBits; i++) {
    add1ToFlipped.in[0][i] <== 1 + in[1][i] - 2*in[1][i];
    add1ToFlipped.in[1][i] <== 0;
  }

  component addWithComplement = BinAdd(nBits);
  for (i=0; i<nBits; i++) {
    addWithComplement.in[0][i] <== in[0][i];
    addWithComplement.in[1][i] <== add1ToFlipped.out[i];
  }

  for (i=0; i<nBits; i++) {
    out[i] <== addWithComplement.out[i];
  }
}
