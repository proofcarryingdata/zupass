import { Circomkit, CircomkitConfig } from "circomkit";
import { existsSync as fsExists } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import circomkitJson from "../circomkit.json";
import {
  PROTO_POD_GPC_FAMILY_NAME,
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES,
  ProtoPODGPC,
  ProtoPODGPCCircuitParams,
  protoPODGPCCircuitParamArray
} from "../src/proto-pod-gpc";
import { batchPromise, circuitDir } from "../src/util";

/**
 * Clears a directory.
 */
export async function clearDir(directory: string): Promise<void> {
  for (const file of await fs.readdir(directory)) {
    await fs.rm(path.join(directory, file));
  }
}

/**
 * Maximum number of parallel promises for Circomkit calls
 * to avoid OOM issues.
 */
export const MAX_PARALLEL_PROMISES = 4;

/**
 * Circuit parameter configuration generator. This generates
 * `circuits.json` and `circuitParameters.json` files.
 */
export async function genCircuitParamConfig(
  circuitParamGenJsonFile: string,
  circuitParamJsonFile: string,
  circuitsJsonFile: string
): Promise<void> {
  // Delete old circuits
  if (fsExists(circuitDir)) {
    await clearDir(circuitDir);
  }

  // Read circuit parameters from JSON.
  const circuitParams = (await fs
    .readFile(circuitParamGenJsonFile, "utf8")
    .then((str) => JSON.parse(str))) as ProtoPODGPCCircuitParams[];

  // Instantiate Circomkit object.
  const circomkit = new Circomkit(circomkitJson as Partial<CircomkitConfig>);

  // Form circuit names
  const circuitNames = circuitParams.map(
    (params) =>
      PROTO_POD_GPC_FAMILY_NAME + "_" + ProtoPODGPC.circuitNameForParams(params)
  );

  // Form `circuits.json`.
  const circuitsJson = circuitParams.map(protoPODGPCCircuitParamArray).reduce(
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
  await fs.writeFile(circuitsJsonFile, JSON.stringify(circuitsJson, null, 2));

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
    circuitParams[i],
    cost
  ]);

  // Write `circuitParameters.json`.
  await fs.writeFile(
    circuitParamJsonFile,
    JSON.stringify(circuitParamJson, null, 2)
  );
}

export async function genCircuitArtifacts(
  circuitsJsonFile: string,
  artifactDir: string
): Promise<void> {
  // Delete old artifacts
  if (fsExists(artifactDir)) {
    await clearDir(artifactDir);
  } else {
    await fs.mkdir(artifactDir, { recursive: true });
  }

  // Instantiate Circomkit object.
  const circomkit = new Circomkit(circomkitJson as Partial<CircomkitConfig>);

  // Read circuit names from circuits.json
  const circuitsJson = await fs
    .readFile(circuitsJsonFile, "utf8")
    .then((str) => JSON.parse(str));
  const circuitNames = Object.keys(circuitsJson);

  // Compile circuits in parallel. The batching lets us compile up to 4
  // circuits at a time to avoid OOM issues.
  await batchPromise(
    MAX_PARALLEL_PROMISES,
    // Note that setup will implicitly compile if r1cs file doesn't exist, but
    // it won't check if inputs have changed or other files (e.g. wasm) are
    // missing, so we do both steps explicitly here. Also, this step is
    // necessary for the ptau step below.
    (circuitName) => circomkit.compile(circuitName),
    circuitNames
  );

  // Fetch powers of tau files in sequence (if necessary). This is done
  // separately from the setup step below to avoid race conditions where
  // two circuit setups running in parallel require the same ptau file:
  // One of them will download the ptau file and the other will find
  // a partially downloaded file and throw an error declaring it invalid.
  for (const circuitName of circuitNames) {
    await circomkit.ptau(circuitName);
  }

  // Set up circuits in parallel to generate all artifacts. This is done
  // 4 circuits as a time for the same reason outlined above.
  await batchPromise(
    MAX_PARALLEL_PROMISES,
    (circuitName) => circomkit.setup(circuitName),
    circuitNames
  );

  // Move artifacts to the right place.
  for (const circuitName of circuitNames) {
    await fs.copyFile(
      path.join("build", circuitName, "groth16_vkey.json"),
      path.join(artifactDir, circuitName + "-vkey.json")
    );
    await fs.copyFile(
      path.join("build", circuitName, "groth16_pkey.zkey"),
      path.join(artifactDir, circuitName + "-pkey.zkey")
    );
    await fs.copyFile(
      path.join(
        "build",
        circuitName,
        circuitName + "_js",
        circuitName + ".wasm"
      ),
      path.join(artifactDir, circuitName + ".wasm")
    );
  }
}
