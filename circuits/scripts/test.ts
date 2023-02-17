const snarkjs = require("snarkjs");
import * as path from "path";
import {
  generateRSACircuitInputs,
  RSACircuitInputs,
} from "../../circom-rsa/scripts/generate_input";
import {
  initializePoseidon,
  poseidon,
} from "/Users/ivanchub/Projects/zk-faucet/circom-merkle/scripts/poseidonHash";
import {
  buildMerkleTree,
  getMerkleProof,
} from "/Users/ivanchub/Projects/zk-faucet/circom-merkle/scripts/merklePoseidon";

const zkeyPath = path.join(process.cwd(), "/build/main/main.zkey");
const vkeyPath = path.join(process.cwd(), "/build/main/vkey.json");
const wasmPath = path.join(process.cwd(), "/build/main/main_js/main.wasm");

interface TestCase {
  input: {
    rsaInputs: RSACircuitInputs;
    merkleInputs: any;
  };
  expected: boolean;
  comment: string;
}

function merkleProof(allKeyHashes: BigInt[], leaf: BigInt) {
  const tree = buildMerkleTree(allKeyHashes.map((t) => t.toString()));
  const proof = getMerkleProof(tree, leaf.toString());
  return proof;
}

async function hashRsaKey(rsaInputs: RSACircuitInputs): Promise<BigInt> {
  await initializePoseidon();
  const hash = poseidon([BigInt(rsaInputs.modulus[0])]);
  return BigInt(hash);
}

export async function getMerkleInputs(rsaInputs: RSACircuitInputs) {
  const depth = 30;
  const pathElements = [];
  const pathIndices = [];

  for (let i = 0; i < depth; i++) {
    pathElements.push(0);
    pathIndices.push(0);
  }

  const leaf = await hashRsaKey(rsaInputs);

  console.log(`leaf`, leaf);

  const proof = merkleProof([1n, 2n, leaf], leaf);

  return {
    pathElements: proof.pathElements,
    pathIndices: proof.pathIndices,
    merkleRoot: proof.root,
  };
}

async function makeTestCases(): Promise<TestCase[]> {
  const cases: TestCase[] = [];

  {
    const rsaInputs = await generateRSACircuitInputs();
    const merkleInputs = await getMerkleInputs(rsaInputs);
    cases.push({
      input: {
        rsaInputs,
        merkleInputs,
      },
      expected: true,
      comment: "both signatures valid, verifying RSA one",
    });
  }

  {
    const rsaInputs = await generateRSACircuitInputs();
    const merkleInputs = await getMerkleInputs(rsaInputs);
    cases.push({
      input: {
        rsaInputs,
        merkleInputs,
      },
      expected: true,
      comment: "both signatures valid, verifying RSA one",
    });
  }

  return cases;
}

export function testCaseToInputs(testCase: TestCase): any {
  const output: any = {
    ...testCase.input.merkleInputs,
  };

  for (const entry of Object.entries(testCase.input.rsaInputs)) {
    output["rsa_" + entry[0]] = entry[1];
  }

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
