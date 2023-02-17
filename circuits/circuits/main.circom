// pragma circom 2.0.6;

include "../../circom-merkle/circuits/merkle.circom";
include "../../circom-rsa/circuits/rsa_verify.circom";
include "../node_modules/circomlib/circuits/mux1.circom";
include "../node_modules/circomlib/circuits/poseidon.circom";

template RSAKeyHash() {
  signal input rsa_modulus[17];
  signal output hash;

  component poseidon = Poseidon(1);

  poseidon.inputs[0] <== rsa_modulus[0];
  
  hash <== poseidon.out;
}

template Main() {
  signal input merkleRoot;

  signal input rsa_message[960]; // TODO: header + . + payload. idk if it's k, we should pad this in javascript beforehand
  signal input rsa_modulus[17]; // rsa pubkey, verified with smart contract + optional oracle
  signal input rsa_signature[17];
  signal input rsa_message_padded_bytes; // length of the message including the padding

  signal input pathElements[30];
  signal input pathIndices[30];

  signal output out;

  component rsaHash = RSAKeyHash();
  rsaHash.rsa_modulus <== rsa_modulus;

  component inclusionChecker = MerkleTreeChecker(30);
  inclusionChecker.root <== merkleRoot;
  inclusionChecker.leaf <== rsaHash.hash;
  inclusionChecker.pathElements <== pathElements;
  inclusionChecker.pathIndices <== pathIndices;

  component rsaChecker = RSAVerify(960, 718, 121, 17);
  rsaChecker.message <== rsa_message;
  rsaChecker.modulus <== rsa_modulus;
  rsaChecker.signature <== rsa_signature;
  rsaChecker.message_padded_bytes <== rsa_message_padded_bytes;

  component finalAnd = MultiAND(2);
  finalAnd.in[0] <== rsaChecker.valid;
  finalAnd.in[1] <== inclusionChecker.out;
  out <== finalAnd.out;
}

component main /* { public [ merkleRoot ] } */ = Main();
