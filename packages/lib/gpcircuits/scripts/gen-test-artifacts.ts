import circomkitJson from "../circomkit.json";
import { Circomkit } from "circomkit";
import * as fs from "fs";
import * as path from "path";
import {
  ProtoPODGPC,
  protoPODGPCParameters,
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES
} from "../src/proto-pod-gpc";

const artifactDir = "artifacts";
const testArtifactDir = path.join(artifactDir, "test");

main = async (): Promise<void> => {
  // Delete old artifacts
  if (fs.existsSync(testArtifactDir)) {
    fs.readdirSync(testArtifactDir).forEach((file) =>
      fs.rm(path.join(testArtifactDir, file), { recursive: true }, (err) => {
        if (err) {
          throw err;
        }
      })
    );
  } else {
    fs.mkdirSync(testArtifactDir);
  }

  const circomkit = new Circomkit(circomkitJson);

  //
  const CIRCUIT_PARAMETERS = [
    [1, 1, 5],
    [1, 5, 8],
    [3, 10, 8]
  ] as [number, number, number][];

  // Form circuit names
  const circuitNames = CIRCUIT_PARAMETERS.map((params) =>
    ProtoPODGPC.circuitNameForParams(protoPODGPCParameters(...params))
  );

  // Form circuits.json
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

  // Write `circuits.json`
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

  // Instantiate circuits
  circuitNames.forEach((circuitName) => circomkit.instantiate(circuitName));

  // Compile circuits
  await Promise.all(
    circuitNames.map((circuitName) => circomkit.compile(circuitName))
  );

  // Set up circuits
  await Promise.all(
    circuitNames.map((circuitName) => circomkit.setup(circuitName))
  );

  // ...and move them to the right place
  circuitNames.forEach((circuitName) =>
    [
      ["groth16_vkey.json", circuitName + "-vkey.json"],
      ["groth16_pkey.zkey", circuitName + "-pkey.zkey"],
      [
        path.join(circuitName + "_js", circuitName + ".wasm"),
        circuitName + ".wasm"
      ]
    ].forEach((filePair) =>
      fs.rename(
        path.join("build", circuitName, filePair[0]),
        path.join(testArtifactDir, filePair[1]),
        (err) => {
          if (err) {
            throw err;
          }
        }
      )
    )
  );

  // Get circuit costs
  const circuitCosts = await Promise.all(
    circuitNames.map(
      /*async*/ (circuitName) =>
        circomkit.info(circuitName).then((info) => info.constraints)
    )
  );

  const circuitParamJson = circuitCosts.map((cost, i) => [
    protoPODGPCParameters(...CIRCUIT_PARAMETERS[i]),
    cost
  ]);

  // Write `circuitParameters.json`
  fs.writeFileSync(
    path.join(artifactDir, "circuitParameters.json"),
    JSON.stringify(circuitParamJson, null, 2),
    (err) => {
      if (err) {
        throw err;
      }
    }
  );

  // Clean up
  fs.rm("build", { recursive: true }, (err) => {
    if (err) {
      throw err;
    }
  });

  console.log("gen-test-artifacts completed successfully!");
};

main()
  .then(() => process.exit())
  .catch((err) => {
    throw err;
  });
