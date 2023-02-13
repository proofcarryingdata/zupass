pragma circom 2.0.0;

include "./verify.circom";
include "../../circuits/node_modules/circomlib/circuits/gates.circom";
include "../../circuits/node_modules/circomlib/circuits/sha256/sha256.circom";
include "../../circuits/node_modules/circomlib/circuits/bitify.circom";

template BatchVerify(n, m) {
  signal input msg[n];
  
  signal input A[m][256];
  signal input R8[m][256];
  signal input S[m][255];

  signal input PointA[m][4][3];
  signal input PointR[m][4][3];

  signal output hash[2];
  signal output verified;

  var i;
  var j;
  var k;

  component verifiers[m];
  component sha256 = Sha256(256 * m);
  for (i=0; i<m; i++) {
    verifiers[i] = Ed25519Verifier(n);
  }

  for (i=0; i<m; i++) {
    for (j=0; j<n; j++) {
      verifiers[i].msg[j] <== msg[j];
    }
    for (j=0; j<255; j++) {
      verifiers[i].A[j] <== A[i][j];
      verifiers[i].R8[j] <== R8[i][j];
      verifiers[i].S[j] <== S[i][j];
    }
    verifiers[i].A[255] <== A[i][255];
    verifiers[i].R8[255] <== R8[i][255];

    for (j=0; j<4; j++) {
      for (k=0; k<3; k++) {
        verifiers[i].PointA[j][k] <== PointA[i][j][k];
        verifiers[i].PointR[j][k] <== PointR[i][j][k];
      }
    }

    for (j=0; j<256; j+=8) {
      for(k=0; k<8; k++) {
        sha256.in[i * 256 + j + k] <== A[i][j + (7 - k)];
      }
    }
  }

  component hashNum1 = Bits2Num(128);
  component hashNum2 = Bits2Num(128);
  for(i=0; i<128; i+=8) {
    for(j=0; j<8; j++) {
      hashNum1.in[i + j] <== sha256.out[i + (7-j)];
      hashNum2.in[i + j] <== sha256.out[i + (7-j) + 128];
    }
  }

  component verifiedNum = Bits2Num(m);
  for (i=0; i<m; i++) {
    verifiedNum.in[i] <== verifiers[i].out;
  }

  hash[0] <== hashNum1.out;
  hash[1] <== hashNum2.out;
  verified <== verifiedNum.out;
}
