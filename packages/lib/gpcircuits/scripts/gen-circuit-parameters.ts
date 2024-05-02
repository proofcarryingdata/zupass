import circomkitJson from "../circomkit.json";
import { Circomkit } from "circomkit";
import * as fs from "fs/promises";
import { existsSync as fsExists } from "fs";
import * as path from "path";
import {
  ProtoPODGPC,
  ProtoPODGPCCircuitParams,
  PROTO_POD_GPC_FAMILY_NAME,
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES
} from "../src/proto-pod-gpc";
import { batchPromise } from "../src/util";
import { clearDir, MAX_PARALLEL_PROMISES } from "./util";

// !!! SINGLE SOURCE OF TRUTH !!!
// IF YOU CHANGE THIS, MAKE SURE TO RUN
// `yarn gen-circuit-parameters`.
// Circuit parameters used to generate artifacts.
const CIRCUIT_PARAMETERS = [
  [1, 1, 5],
  [1, 5, 8],
  [3, 10, 8]
];

const projectDir = path.join(__dirname, "..");
const circuitDir = path.join(projectDir, "circuits", "main");

async function main(): Promise<void> {
  // Delete old circuits
  if (await fsExists(circuitDir)) {
    await clearDir(circuitDir);
  }

  // Instantiate Circomkit object.
  const circomkit = new Circomkit(circomkitJson);

  // Form circuit names
  const circuitNames = CIRCUIT_PARAMETERS.map(
    (params) =>
      PROTO_POD_GPC_FAMILY_NAME +
      "_" +
      ProtoPODGPC.circuitNameForParams(ProtoPODGPCCircuitParams(...params))
  );

  // Form `circuits.json`.
  const circuitsJson = CIRCUIT_PARAMETERS.reduce(
    (json, params, i) => ({
      ...json,
      [circuitNames[i]]: {
        file: "proto-pod-gpc",
        template: "ProtoPODGPC",
        params: params,
        pubs: PROTO_POD_GPC_PUBLIC_INPUT_NAMES
      }
    }),
    {}
  );

  // Write `circuits.json`.
  await fs.writeFile(
    path.join(projectDir, "circuits.json"),
    JSON.stringify(circuitsJson, null, 2)
  );

  console.log("circuits.json written successfully.");

  // Instantiate circuits.
  circuitNames.forEach((circuitName) => circomkit.instantiate(circuitName));

  // Compile circuits in parallel.
  await batchPromise(
    MAX_PARALLEL_PROMISES,
    (circuitName) => circomkit.compile(circuitName),
    circuitNames
  );

  // Get circuit costs in parallel.
  const circuitCosts = await Promise.all(
    circuitNames.map((circuitName) =>
      circomkit.info(circuitName).then((info) => info.constraints)
    )
  );

  // Form `circuitParameters.json`.
  const circuitParamJson = circuitCosts.map((cost, i) => [
    ProtoPODGPCCircuitParams(...CIRCUIT_PARAMETERS[i]),
    cost
  ]);

  // Write `circuitParameters.json`.
  await fs.writeFile(
    path.join(projectDir, "src", "circuitParameters.json"),
    JSON.stringify(circuitParamJson, null, 2)
  );

  // Clean up.
  await fs.rm(path.join(projectDir, "build"), { recursive: true });

  console.log("gen-circuit-parameters completed successfully!");
}

main()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
  });
