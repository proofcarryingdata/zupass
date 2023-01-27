const snarkjs = require("snarkjs");
import { getInputs } from "./index";

const zkeyPath =
  "/Users/ivanchub/Projects/ed25519-circom/build/circuit_final_1.zkey";
const vkeyPath =
  "/Users/ivanchub/Projects/ed25519-circom/build/verification_key.json";
const wasmPath =
  "/Users/ivanchub/Projects/ed25519-circom/build/verify_js/verify.wasm";

async function test() {
  console.log("generating inputs");
  const inputs = await getInputs();
  console.log("generated inputs");

  console.log("generating proof");
  const proof = await snarkjs.groth16.fullProve(inputs, wasmPath, zkeyPath);
  console.log("generated proof");
  console.log(proof);

  require("fs").writeFileSync("./proof.json", JSON.stringify(proof, null, 2));

  console.log("verifying proof");
  const verified = await snarkjs.groth16.verify(
    JSON.parse(require("fs").readFileSync(vkeyPath).toString()),
    proof.publicSignals,
    proof.proof
  );
  console.log("verification complete");
  console.log(verified);
}

test();
