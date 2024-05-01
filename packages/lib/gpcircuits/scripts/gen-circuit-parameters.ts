import circomkitJson from "../circomkit.json";
import { Circomkit } from "circomkit";
import * as fs from "fs";
import * as path from "path";
import {
  ProtoPODGPC,
  ProtoPODGPCParameters,
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES
} from "../src/proto-pod-gpc";
import { batchPromise, maxParallelPromises } from "../src/util";

// Circuit parameters used to generate artifacts.
const CIRCUIT_PARAMETERS = [
  [1, 1, 5],
  [1, 5, 8],
  [3, 10, 8]
];

const circuitDir = path.join("circuits", "main");

main = async (): Promise<void> => {
  // Delete old circuits
  if (fs.existsSync(circuitDir)) {
    fs.readdirSync(circuitDir).forEach((file) =>
      fs.rmSync(path.join(circuitDir, file), {}, (err) => {
        if (err) {
          throw err;
        }
      })
    );
  }

  // Instantiate Circomkit object.
  const circomkit = new Circomkit(circomkitJson);

  // Form circuit names
  const circuitNames = CIRCUIT_PARAMETERS.map((params) =>
    ProtoPODGPC.circuitNameForParams(ProtoPODGPCParameters(...params))
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
  fs.writeFileSync(
    "./circuits.json",
    JSON.stringify(circuitsJson, null, 2),
    (err) => {
      if (err) {
        throw err;
      }
    }
  );

  console.log("circuits.json written successfully.");

  // Instantiate circuits.
  circuitNames.forEach((circuitName) => circomkit.instantiate(circuitName));

  // Compile circuits.
  await batchPromise(
    maxParallelPromises,
    (circuitName) => circomkit.compile(circuitName),
    circuitNames
  );

  // Get circuit costs.
  const circuitCosts = await Promise.all(
    circuitNames.map(
      /*async*/ (circuitName) =>
        circomkit.info(circuitName).then((info) => info.constraints)
    )
  );

  // Form `circuitParameters.json`.
  const circuitParamJson = circuitCosts.map((cost, i) => [
    ProtoPODGPCParameters(...CIRCUIT_PARAMETERS[i]),
    cost
  ]);

  // Write `circuitParameters.json`.
  fs.writeFileSync(
    path.join("src", "circuitParameters.json"),
    JSON.stringify(circuitParamJson, null, 2),
    (err) => {
      if (err) {
        throw err;
      }
    }
  );

  // Clean up.
  fs.rmSync("build", { recursive: true }, (err) => {
    if (err) {
      throw err;
    }
  });

  console.log("gen-circuit-parameters completed successfully!");
};

main()
  .then(() => process.exit())
  .catch((err) => {
    throw err;
  });
