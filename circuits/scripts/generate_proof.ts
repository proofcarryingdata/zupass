const snarkjs = require("snarkjs");
import { getRawSignature } from "./sshFormat";
import * as fs from "fs";
import * as path from "path";
import { bytesToBigInt } from "./binaryFormat";
import { getRsaCircuitInputs } from "../../circom-rsa/scripts/generate_input";
import {
  buildMerkleTree,
  getMerkleProof,
} from "/Users/ivanchub/Projects/zk-faucet/circom-merkle/scripts/merklePoseidon";
import { getMerkleInputs, testCaseToInputs } from "./test";

import { createHash } from "crypto";
import { shaHash, shaHashHex } from "../../circom-rsa/scripts/shaHash";

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
  const signaturePath = path.join(process.cwd(), "operands", "signature.txt");
  const signature = fs.readFileSync(signaturePath);

  // const rawSignature = getRawSignature(signature);
  // const modulus = rawSignature.pubKeyParts[2];
  // const preamble = new TextEncoder().encode("SSHSIG");
  // const namespace = rawSignature.namespace;
  // const reserved = rawSignature.reserved;
  // const hash_algorithm = rawSignature.hash_algorithm;

  // const hashedMessage = await shaHash(new TextEncoder().encode(message));
  // console.log("message to sign:", `'${message}'`);
  // console.log("decoded namespace:", `'${new TextDecoder().decode(namespace)}'`);
  // console.log(
  //   "decoded hash_algorithm:",
  //   `'${new TextDecoder().decode(hash_algorithm)}'`
  // );
  // console.log("modulus: ", bytesToBigInt(modulus));
  // console.log("message hash: ", [...hashedMessage]);
  // console.log("message hash length:", hashedMessage.length);

  // console.log(
  //   "actual hash:",
  //   "a665a45920422f9d417e4867efdc4fb8a04a1f3fff1fa07e998e86f7f7a27ae3"
  // );
  // console.log("hash", await shaHashHex(new TextEncoder().encode(message)));

  // const preimage = new Uint8Array([
  //   ...preamble,
  //   ...[0, 0, 0, namespace.length],
  //   ...namespace,
  //   ...[0, 0, 0, 0], // reserved
  //   ...[0, 0, 0, hash_algorithm.length],
  //   ...hash_algorithm,
  //   ...[0, 0, 0, 32],
  //   ...hashedMessage,
  // ]);

  // console.log("preimage:", [...preimage]);

  const rsaInputs = await getRsaCircuitInputs(
    new TextEncoder().encode(message),
    signature,
    28798040674710539207596949694923013804428743443373373353914260566051348244739142782169961022732573401435294091974265892504477401700244639387273721125253458479175478899658997622019958556775204670031181345066243364457044219421361632564057092299574324356119484911427940999634425196208365533703340234208775599250862517208656264586998290864073743972682619762747116831752827458296642463698966032985559107525950660238557277791551111108517980973442187793596658648829821624998654112824489731250128010477887844913667489326752569478940063485607745241034636678984136755701038930132004614596515846637522587762280076137191718820301n
  );

  const signatureAlgorithm = 0;
  const merkleInputs = await getMerkleInputs(rsaInputs);

  const testCase = {
    input: {
      rsaInputs,
      merkleInputs,
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
    console.log("test status: ", true);
  } else {
    console.log("test status: ", false);
  }
}

generateSshProof();
