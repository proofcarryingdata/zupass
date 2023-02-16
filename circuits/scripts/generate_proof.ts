const snarkjs = require("snarkjs");
import { getRawSignature } from "./sshFormat";
import * as fs from "fs";
import * as path from "path";
import { bytesToBigInt } from "./binaryFormat";
import { getRsaCircuitInputs } from "../../circom-rsa/scripts/generate_input";
import { getEd25519CircuitInputs } from "../../faucet/packages/utils/src/ed25519/generateInputs";
import {
  buildMerkleTree,
  getMerkleProof,
} from "/Users/ivanchub/Projects/zk-faucet/circom-merkle/scripts/merklePoseidon";
import { getMerkleInputs, testCaseToInputs } from "./test";

import { createHash } from "crypto";

const zkeyPath = path.join(process.cwd(), "/build/main/main.zkey");
const vkeyPath = path.join(process.cwd(), "/build/main/vkey.json");
const wasmPath = path.join(process.cwd(), "/build/main/main_js/main.wasm");

const pathToMerkleTree = "";

/**
 *
 */
export async function generateSshProof() {
  const messagePath = path.join(process.cwd(), "operands", "input.txt");
  const message = fs.readFileSync(messagePath).toString();
  console.log(message);
  const signaturePath = path.join(process.cwd(), "operands", "signature.txt");
  const signature = fs.readFileSync(signaturePath).toString();
  const rawSignature = getRawSignature(signature);
  const modulus = rawSignature.pubKeyParts[2];

  console.log(rawSignature);

  const rsaInputs = await getRsaCircuitInputs(
    message,
    rawSignature.rawSignature,
    bytesToBigInt(modulus)
  );
  const ed25519Inputs = await getEd25519CircuitInputs();
  const signatureAlgorithm = 0;
  const merkleInputs = await getMerkleInputs(
    rsaInputs,
    ed25519Inputs,
    signatureAlgorithm
  );

  const testCase = {
    input: {
      rsaInputs,
      ed25519Inputs,
      merkleInputs,
      signatureAlgorithm,
    },
    expected: true,
    comment: "both signatures valid, verifying RSA one",
  };

  const inputs = testCaseToInputs(testCase);

  console.log("generating proof");
  const proof = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
  console.log("generated proof");
  console.log("public signals", proof.publicSignals);
  const verified = await snarkjs.groth16.verify(
    JSON.parse(require("fs").readFileSync(vkeyPath).toString()),
    proof.publicSignals,
    proof.proof
  );
  console.log("proof verification status: ", verified);

  const isProofIndicatingValidSignature = proof.publicSignals[0] === "1";

  if (isProofIndicatingValidSignature === testCase.expected) {
    console.log("expected output matches actual output");
  } else {
    console.log("EXPECTED OUTPUT DOES NOT MATCH ACTUAL OUTPUT");
  }
}

generateSshProof();
