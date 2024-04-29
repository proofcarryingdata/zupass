import circomkitJson from "../circomkit.json";
import { Circomkit } from "circomkit";
import * as fs from "fs";
import * as path from "path";
import {
  ProtoPODGPC,
  ProtoPODGPCParameters,
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES
} from "../src/proto-pod-gpc";

// Circuit parameters used to generate artifacts.
const CIRCUIT_PARAMETERS = [
  [1, 1, 5],
  [1, 5, 8],
  [3, 10, 8]
];

const artifactDir = "artifacts";
const circuitDir = path.join("circuits", "main");
const testArtifactDir = path.join(artifactDir, "test");

// Helpers to avoid Wasm OOM errors with larger
// arrays of circuit parameters.
const maxParallelPromises = 4;
const toChunks = <A>(arr: A[], n: number): A[][] =>
  arr.reduce(
    (chunks, a) => {
      const lastChunkIndex = chunks.length - 1;
      return chunks[lastChunkIndex].length < n
        ? chunks
            .slice(0, lastChunkIndex)
            .concat([chunks[lastChunkIndex].concat([a])])
        : chunks.concat([[a]]);
    },
    [[]]
  );
const seqPromise = <A, B>(f: (a: A) => Promise<B>, arr: A[]): Promise<B[]> =>
  arr
    .map((a) => () => f(a))
    .reduce(
      (out, delayedPromise) =>
        out.then((arr) => delayedPromise().then((x: B) => arr.concat([x]))),
      Promise.resolve([])
    );
const batchPromise = <A, B>(
  f: (a: A) => Promise<B>,
  arr: A[]
): Promise<B[][]> =>
  seqPromise(
    (arr) => Promise.all(arr.map(f)),
    toChunks(arr, maxParallelPromises)
  );
main = async (): Promise<void> => {
  // Delete old artifacts and circuits
  if (fs.existsSync(testArtifactDir)) {
    fs.readdirSync(testArtifactDir).forEach((file) =>
      fs.rmSync(path.join(testArtifactDir, file), {}, (err) => {
        if (err) {
          throw err;
        }
      })
    );
  } else {
    fs.mkdirSync(testArtifactDir);
  }

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
    (circuitName) => circomkit.compile(circuitName),
    circuitNames
  );

  // Set up circuits.
  await batchPromise(
    (circuitName) => circomkit.setup(circuitName),
    circuitNames
  );

  // Move artifacts to the right place.
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
    path.join(artifactDir, "circuitParameters.json"),
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

  console.log("gen-test-artifacts completed successfully!");
};

main()
  .then(() => process.exit())
  .catch((err) => {
    throw err;
  });
