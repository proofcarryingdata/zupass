const snarkjs = require("snarkjs");
import * as path from "path";
import { generate_inputs, ICircuitInputs } from "./generate_input";

const zkeyPath = path.join(process.cwd(), "/build/main/main.zkey");
const vkeyPath = path.join(process.cwd(), "/build/main/vkey.json");
const wasmPath = path.join(process.cwd(), "/build/main/main_js/main.wasm");

interface TestCase {
  input: ICircuitInputs;
  expected: boolean;
  comment: string;
}

async function makeTestCases(): Promise<TestCase[]> {
  const cases: TestCase[] = [];

  cases.push({
    input: await generate_inputs(),
    expected: true,
    comment: "valid inputs should verify properly",
  });

  const invalidInput1 = await generate_inputs();
  const editedSignaturePart = [...invalidInput1.signature[0]];
  if (editedSignaturePart[0] === "1") {
    editedSignaturePart[0] = "2";
  } else {
    editedSignaturePart[0] = "1";
  }
  invalidInput1.signature[0] = editedSignaturePart.join("");

  cases.push({
    input: invalidInput1,
    expected: false,
    comment: "one digit of the signature was modified, so it shouldn't verify",
  });

  return cases;
}

async function runTestCases() {
  console.log("generating test cases");
  const cases = await makeTestCases();
  console.log("finished generating test cases");

  for (let i = 0; i < cases.length; i++) {
    console.log("running test case ", cases[i].comment);
    console.log("generating proof");
    const proof = await snarkjs.groth16.fullProve(
      cases[i].input,
      wasmPath,
      zkeyPath
    );
    console.log("generated proof");
    console.log("public signals", proof.publicSignals);
    const verified = await snarkjs.groth16.verify(
      JSON.parse(require("fs").readFileSync(vkeyPath).toString()),
      proof.publicSignals,
      proof.proof
    );
    console.log("proof verification status: ", verified);

    const isProofIndicatingValidSignature = proof.publicSignals[0] === "1";

    if (isProofIndicatingValidSignature === cases[i].expected) {
      console.log("expected output matches actual output");
    } else {
      console.log("EXPECTED OUTPUT DOES NOT MATCH ACTUAL OUTPUT");
    }
  }
}

async function test() {
  console.log("running test suite");
  const inputs = await runTestCases();
  console.log("finished running test suite");
  process.exit(0);
}

test();
