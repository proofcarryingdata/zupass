const snarkjs = require("snarkjs");
import * as path from "path";
import { generate_inputs } from "./generate_input";

const zkeyPath = path.join(process.cwd(), "/build/main/main.zkey");
const vkeyPath = path.join(process.cwd(), "/build/main/vkey.json");
const wasmPath = path.join(process.cwd(), "/build/main/main_js/main.wasm");

async function test() {
  console.log("generating inputs");
  const inputs = await generate_inputs();
  console.log("generated inputs");
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
  console.log("OK");
}

test();
