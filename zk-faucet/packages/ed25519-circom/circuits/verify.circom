pragma circom 2.0.0;

include "./scalarmul.circom";
include "./modulus.circom";
include "./point-addition.circom";
include "./pointcompress.circom";

include "../../../node_modules/@electron-labs/sha512/circuits/sha512/sha512.circom";
include "../../../node_modules/circomlib/circuits/comparators.circom";
include "../../../node_modules/circomlib/circuits/gates.circom";

/**
msg is the data for the signature

R8 is the first 256 bits of the signature (LSB to MSB)

S is the first 255 bits of the last 256 bits of the signature (LSB to MSB)

A is the public key in binary (LSB to MSB)

PointA is the point representing the public key on the elliptic curve (encoded in base 2^85 for brevity)

PointR is the point representing the R8 value on the elliptic curve (encoded in base 2^85)
 */
 
template Ed25519Verifier(n) {
  assert(n % 8 == 0);
  
  signal input msg[n];
  
  signal input A[256];
  signal input R8[256];
  signal input S[255];

  signal input PointA[4][3];
  signal input PointR[4][3];

  signal output out;

  var G[4][3] = [[6836562328990639286768922, 21231440843933962135602345, 10097852978535018773096760],
                 [7737125245533626718119512, 23211375736600880154358579, 30948500982134506872478105],
                 [1, 0, 0],
                 [20943500354259764865654179, 24722277920680796426601402, 31289658119428895172835987]
                ];

  var i;
  var j;

  component compressA = PointCompress();
  component compressR = PointCompress();
  for (i=0; i<4; i++) {
    for (j=0; j<3; j++) {
      compressA.P[i][j] <== PointA[i][j];
      compressR.P[i][j] <== PointR[i][j];
    }
  }

  for (i=0; i<256; i++) {
    compressA.out[i] === A[i];
    compressR.out[i] === R8[i];
  }

  component hash = Sha512(n+256+256);
  for (i=0; i<256; i+=8) {
    for(j=0; j<8; j++) {
      hash.in[i+j] <== R8[i+(7-j)];
      hash.in[256+i+j] <== A[i+(7-j)];
    }
  }
  for (i=0; i<n; i+=8) {
    for(j=0; j<8; j++) {
      hash.in[512+i+j] <== msg[i+(7-j)];
    }
  }

  component bitModulus = ModulusWith252c(512);
  for (i=0; i<512; i+=8) {
    for(j=0; j<8; j++) {
      bitModulus.in[i+j] <== hash.out[i + (7-j)];
    }
  }

  // point multiplication s, G
  component pMul1 = ScalarMul();
  for(i=0; i<255; i++) {
    pMul1.s[i] <== S[i];
  }
  for (i=0; i<4; i++) {
    for (j=0; j<3; j++) {
      pMul1.P[i][j] <== G[i][j];
    }
  }

  // point multiplication h, A
  component pMul2 = ScalarMul();
  for (i=0; i<253; i++) {
    pMul2.s[i] <== bitModulus.out[i];
  }
  pMul2.s[253] <== 0;
  pMul2.s[254] <== 0;

  for (i=0; i<4; i++) {
    for (j=0; j<3; j++) {
      pMul2.P[i][j] <== PointA[i][j];
    }
  }

  component addRH = PointAdd();
  for (i=0; i<4; i++) {
    for (j=0; j<3; j++) {
      addRH.P[i][j] <== PointR[i][j];
      addRH.Q[i][j] <== pMul2.sP[i][j];
    }
  }

  component equal = PointEqual();
  for(i=0; i<3; i++) {
    for(j=0; j<3; j++) {
      equal.p[i][j] <== pMul1.sP[i][j];
      equal.q[i][j] <== addRH.R[i][j];
    }
  }

  out <== equal.out;
}

template PointEqual() {
  signal input p[3][3];
  signal input q[3][3];
  signal output out;

  var i;
  var j;
  component mul[4];
  for (i=0; i<4; i++) {
    mul[i] = ChunkedMul(3, 3, 85);
  }
  
  for(i=0; i<3; i++) {
    // P[0] * Q[2]
    mul[0].in1[i] <== p[0][i];
    mul[0].in2[i] <== q[2][i];

    // Q[0] * P[2]
    mul[1].in1[i] <== q[0][i];
    mul[1].in2[i] <== p[2][i];

    // P[1] * Q[2]
    mul[2].in1[i] <== p[1][i];
    mul[2].in2[i] <== q[2][i];

    // Q[1] * P[2]
    mul[3].in1[i] <== q[1][i];
    mul[3].in2[i] <== p[2][i];
  }

  component mod[4];
  for (i=0; i<4; i++) {
    mod[i] = ModulusWith25519Chunked51(6);
  }
  
  for(i=0; i<6; i++) {
    // (P[0] * Q[2]) % p
    mod[0].in[i] <== mul[0].out[i];

    // (Q[0] * P[2]) % p
    mod[1].in[i] <== mul[1].out[i];

    // (P[1] * Q[2]) % p
    mod[2].in[i] <== mul[2].out[i];

    // (Q[1] * P[2]) % p
    mod[3].in[i] <== mul[3].out[i];
  }

  // output = (P[0] * Q[2]) % p == (Q[0] * P[2]) % p && (P[1] * Q[2]) % p == (Q[1] * P[2]) % p

  component equal[2][3];
  component and1[3];
  component and2[2];

  for (j = 0; j < 2; j++) {
    equal[j][0] = IsEqual();
    equal[j][0].in[0] <== mod[2 * j].out[0];
    equal[j][0].in[1] <== mod[2 * j + 1].out[0];
  }

  and1[0] = AND();
  and1[0].a <== equal[0][0].out;
  and1[0].b <== equal[1][0].out;

  for (i=1; i<3; i++) {
    for (j = 0; j < 2; j++) {
      equal[j][i] = IsEqual();
      equal[j][i].in[0] <== mod[2 * j].out[i];
      equal[j][i].in[1] <== mod[2 * j + 1].out[i];
    }

    and1[i] = AND();
    and1[i].a <== equal[0][i].out;
    and1[i].b <== equal[1][i].out;

    and2[i-1] = AND();
    and2[i-1].a <== and1[i-1].out;
    and2[i-1].b <== and1[i].out;
  }

  out <== and2[1].out;
}
