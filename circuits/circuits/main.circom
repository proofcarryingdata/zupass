// pragma circom 2.0.6;

include "../../circom-merkle/circuits/merkle.circom";
include "../../circom-rsa/circuits/rsa_verify.circom";
include "../../circom-ed25519/circuits/verify.circom";

template Main() {
  // 1 for RSA
  // 2 for ED25519
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

  signal output out;

  // component checker = MerkleTreeChecker(1);
  // checker.root <== merkleRoot;
  // checker.leaf <== 0;
  // checker.pathElements <== [ 0 ];
  // checker.pathIndices <== [ 0 ];

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
}

component main { public [ merkleRoot ] } = Main();
