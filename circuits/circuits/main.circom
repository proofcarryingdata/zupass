// pragma circom 2.0.6;

include "../../circom-merkle/circuits/merkle.circom";
include "../../circom-rsa/circuits/rsa_verify.circom";

template Main() {
  signal input merkleRoot;
  signal input rsa_message[960]; // TODO: header + . + payload. idk if it's k, we should pad this in javascript beforehand
  signal input rsa_modulus[17]; // rsa pubkey, verified with smart contract + optional oracle
  signal input rsa_signature[17];
  signal input rsa_message_padded_bytes; // length of the message including the padding

  component checker = MerkleTreeChecker(1);
  checker.root <== merkleRoot;
  checker.leaf <== 0;
  checker.pathElements <== [ 0 ];
  checker.pathIndices <== [ 0 ];

  component rsaChecker = RSAVerify(960, 718, 121, 17);
  rsaChecker.message <== rsa_message;
  rsaChecker.modulus <== rsa_modulus;
  rsaChecker.signature <== rsa_signature;
  rsaChecker.message_padded_bytes <== rsa_message_padded_bytes;
}

component main { public [ merkleRoot ] } = Main();
