const snarkjs = require("snarkjs");
import * as path from "path";
import {
  generateRSACircuitInputs,
  RSACircuitInputs,
} from "../../circom-rsa/scripts/generate_input";
import { getEd25519CircuitInputs } from "../../faucet/packages/utils/src/ed25519/generateInputs";
import {
  initializePoseidon,
  poseidon,
} from "/Users/ivanchub/Projects/zk-faucet/circom-merkle/scripts/poseidonHash";

const zkeyPath = path.join(process.cwd(), "/build/main/main.zkey");
const vkeyPath = path.join(process.cwd(), "/build/main/vkey.json");
const wasmPath = path.join(process.cwd(), "/build/main/main_js/main.wasm");

interface TestCase {
  input: {
    rsaInputs: RSACircuitInputs;
    ed25519Inputs: any;
    merkleInputs: any;
    signatureAlgorithm: number;
  };
  expected: boolean;
  comment: string;
}

async function hashRsaKey(rsaInputs: RSACircuitInputs): Promise<BigInt> {
  await initializePoseidon();
  const hash = poseidon([BigInt(rsaInputs.modulus[0])]);
  return BigInt(hash);
}

async function hashEd25519Inputs(ed25519Inputs: any): Promise<BigInt> {
  await initializePoseidon();
  const hash = poseidon([BigInt(ed25519Inputs.PointA[0][0])]);
  return BigInt(hash);
}

async function getMerkleInputs(
  rsaInputs: RSACircuitInputs,
  ed25519Inputs: any,
  signatureAlgorithm: number
) {
  const depth = 30;
  const pathElements = [];
  const pathIndices = [];

  for (let i = 0; i < depth; i++) {
    pathElements.push(0);
    pathIndices.push(0);
  }

  if (signatureAlgorithm === 0) {
    let leaf = await hashRsaKey(rsaInputs);
    console.log(`leaf`, leaf);
  } else {
    let leaf = await hashEd25519Inputs(ed25519Inputs);
    console.log(`leaf`, leaf);
  }

  return {
    pathElements,
    pathIndices,
  };
}

async function makeTestCases(): Promise<TestCase[]> {
  const cases: TestCase[] = [];

  {
    const rsaInputs = await generateRSACircuitInputs();
    const ed25519Inputs = await getEd25519CircuitInputs();
    const signatureAlgorithm = 0;
    const merkleInputs = await getMerkleInputs(
      rsaInputs,
      ed25519Inputs,
      signatureAlgorithm
    );
    cases.push({
      input: {
        rsaInputs,
        ed25519Inputs,
        merkleInputs,
        signatureAlgorithm,
      },
      expected: true,
      comment: "both signatures valid, verifying RSA one",
    });
  }

  {
    const rsaInputs = await generateRSACircuitInputs();
    const ed25519Inputs = await getEd25519CircuitInputs();
    const signatureAlgorithm = 1;
    const merkleInputs = await getMerkleInputs(
      rsaInputs,
      ed25519Inputs,
      signatureAlgorithm
    );
    cases.push({
      input: {
        rsaInputs,
        ed25519Inputs,
        merkleInputs,
        signatureAlgorithm,
      },
      expected: true,
      comment: "both signatures valid, verifying RSA one",
    });
  }

  return cases;
}

function testCaseToInputs(testCase: TestCase): any {
  const output: any = {
    ...testCase.input.merkleInputs,
  };

  for (const entry of Object.entries(testCase.input.rsaInputs)) {
    output["rsa_" + entry[0]] = entry[1];
  }

  for (const entry of Object.entries(testCase.input.ed25519Inputs)) {
    output["ed25519_" + entry[0]] = entry[1];
  }

  output.signatureAlgorithm = testCase.input.signatureAlgorithm;

  return output;
}

async function runTestCases() {
  console.log("generating test cases");
  const cases = await makeTestCases();
  console.log("finished generating test cases");

  for (let i = 0; i < cases.length; i++) {
    console.log("running test case ", cases[i].comment);
    console.log("generating proof");
    const proof = await snarkjs.groth16.fullProve(
      testCaseToInputs(cases[i]),
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
