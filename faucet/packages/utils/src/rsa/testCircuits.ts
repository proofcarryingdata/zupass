import * as path from "path";
import { generateInputs } from "./generateInputs";
const snarkjs = require("snarkjs");

const zkeyPath = path.join(
  process.cwd(),
  "../../../circom-rsa/build/circuit_final_1.zkey"
);
const vkeyPath = path.join(
  process.cwd(),
  "../../../circom-rsa/build/verification_key.json"
);
const wasmPath = path.join(
  process.cwd(),
  "../../../circom-rsa/build/rsa_verify_js/rsa_verify.wasm"
);

async function test() {
  console.log("generating inputs");
  const inputs = await generateInputs();
  console.log("generated inputs");

  console.log("generating proof");
  const proof = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
  console.log("generated proof");
  console.log(proof);

  require("fs").writeFileSync(
    "./proof_rsa.json",
    JSON.stringify(proof, null, 2)
  );

  console.log("verifying proof");
  const verified = await snarkjs.groth16.verify(
    JSON.parse(require("fs").readFileSync(vkeyPath).toString()),
    proof.publicSignals,
    proof.proof
  );
  console.log("verification complete");
  console.log(verified);
  process.exit(0);
}

test();
