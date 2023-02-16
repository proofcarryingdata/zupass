// pragma circom 2.0.6;

include "../../circom-merkle/circuits/merkle.circom";
include "../../circom-rsa/circuits/rsa_verify.circom";
include "../../circom-ed25519/circuits/verifier.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

template ED25519KeyHash() {
  signal input ed25519_A[256];
  signal input ed25519_R8[256];
  signal input ed25519_S[255];
  signal input ed25519_PointA[4][3];
  signal input ed25519_PointR[4][3];
  signal output hash;

  component poseidon = Poseidon(1);

  poseidon.inputs[0] <== ed25519_PointA[0][0];

  hash <== poseidon.out;
}

template RSAKeyHash() {
  signal input rsa_modulus[17];
  signal output hash;

  component poseidon = Poseidon(1);

  poseidon.inputs[0] <== rsa_modulus[0];
  
  hash <== poseidon.out;
}

template Main() {
  // 0 for RSA
  // 1 for ED25519
  signal input signatureAlgorithm;

  signal input merkleRoot;

  signal input rsa_message[960]; // TODO: header + . + payload. idk if it's k, we should pad this in javascript beforehand
  signal input rsa_modulus[17]; // rsa pubkey, verified with smart contract + optional oracle
  signal input rsa_signature[17];
  signal input rsa_message_padded_bytes; // length of the message including the padding

  signal input ed25519_msg[16];
  signal input ed25519_A[256];
  signal input ed25519_R8[256];
  signal input ed25519_S[255];
  signal input ed25519_PointA[4][3];
  signal input ed25519_PointR[4][3];

  signal input pathElements[30];
  signal input pathIndices[30];

  signal output out;

  component rsaHash = RSAKeyHash();
  rsaHash.rsa_modulus <== rsa_modulus;

  component ed25519Hash = ED25519KeyHash();
  ed25519Hash.ed25519_A <== ed25519_A;
  ed25519Hash.ed25519_R8 <== ed25519_R8;
  ed25519Hash.ed25519_S <== ed25519_S;
  ed25519Hash.ed25519_PointA <== ed25519_PointA;
  ed25519Hash.ed25519_PointR <== ed25519_PointR;

  component hashMux = Mux1();
  hashMux.c[0] <== rsaHash.hash;
  hashMux.c[1] <== ed25519Hash.hash;
  hashMux.s <== signatureAlgorithm;

  component inclusionChecker = MerkleTreeChecker(30);
  inclusionChecker.root <== merkleRoot;
  inclusionChecker.leaf <== hashMux.out;
  inclusionChecker.pathElements <== pathElements;
  inclusionChecker.pathIndices <== pathIndices;

  component rsaChecker = RSAVerify(960, 718, 121, 17);
  rsaChecker.message <== rsa_message;
  rsaChecker.modulus <== rsa_modulus;
  rsaChecker.signature <== rsa_signature;
  rsaChecker.message_padded_bytes <== rsa_message_padded_bytes;

  component ed25519Checker = Ed25519Verifier(16);
  ed25519Checker.msg <== ed25519_msg;
  ed25519Checker.A <== ed25519_A;
  ed25519Checker.R8 <== ed25519_R8;
  ed25519Checker.S <== ed25519_S;
  ed25519Checker.PointA <== ed25519_PointA;
  ed25519Checker.PointR <== ed25519_PointR;

  component validSignatureMux = Mux1();
  validSignatureMux.c[0] <== rsaChecker.valid;
  validSignatureMux.c[1] <== ed25519Checker.out;
  validSignatureMux.s <== signatureAlgorithm;

  component finalAnd = MultiAND(2);
  finalAnd.in[0] <== validSignatureMux.out;
  // finalAnd.in[1] <== inclusionChecker.out;
  finalAnd.in[1] <== 1;
  out <== finalAnd.out;
  
  signal output a;
  a <== 1;
  signal output b;
  b <== 2;
  signal output c;
  c <== ed25519Hash.hash;
  signal output d;
  d <== 4;
  signal output e;
  e <== rsaHash.hash;
  signal output f;
  f <== 5;
  signal output g;
  g <== 6;
  signal output h;
  h <== hashMux.out;
}

component main /* { public [ merkleRoot ] } */ = Main();
