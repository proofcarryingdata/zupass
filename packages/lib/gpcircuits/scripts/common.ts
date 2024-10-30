import { Circomkit, CircomkitConfig } from "circomkit";
import { existsSync as fsExists, readFileSync as fsReadFile } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import { env } from "process";
import circomkitJson from "../circomkit.json";
import {
  PROTO_POD_GPC_FAMILY_NAME,
  PROTO_POD_GPC_PUBLIC_INPUT_NAMES,
  ProtoPODGPC,
  ProtoPODGPCCircuitDesc,
  ProtoPODGPCCircuitParams,
  protoPODGPCCircuitParamArray
} from "../src/proto-pod-gpc";
import { batchPromise } from "../src/util";
import { PARAMS as PROD_PARAMS } from "./parameters/paramGen";
import { PARAMS as TEST_PARAMS } from "./parameters/testParamGen";
import { clearDir } from "./util";

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
  circuitParams: ProtoPODGPCCircuitParams[],
  circuitParamJsonFile: string,
  circuitsJsonFile: string
): Promise<void> {
  // Delete old circuits
  if (fsExists(CIRCUIT_DIR)) {
    await clearDir(CIRCUIT_DIR);
  }
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

/**
 * Circuit artifact generator.
 */
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
  const circomkit = new Circomkit({
    ...circomkitJson,
    circuits: circuitsJsonFile
  } as Partial<CircomkitConfig>);

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

/**
 * Constants specifying locations of files and directories relevant to circuit
 * parameter and artifact generation.
 */
const PROJECT_DIR = path.join(__dirname, "..");
export const ARTIFACTS_DIR = path.join(PROJECT_DIR, "artifacts");
export const CIRCUIT_DIR = path.join(PROJECT_DIR, "circuits", "main");
export const JSON_FILE_CONFIG: Record<
  string,
  {
    circuitParams: ProtoPODGPCCircuitParams[];
    circuitParamJsonFile: string;
    circuitsJsonFile: string;
  }
> = {
  prod: {
    circuitParams: PROD_PARAMS,
    circuitParamJsonFile: path.join(
      PROJECT_DIR,
      "src",
      "circuitParameters.json"
    ),
    circuitsJsonFile: path.join(PROJECT_DIR, "circuits.json")
  },
  test: {
    circuitParams: TEST_PARAMS,
    circuitParamJsonFile: path.join(
      PROJECT_DIR,
      "src",
      "testCircuitParameters.json"
    ),
    circuitsJsonFile: path.join(PROJECT_DIR, "testCircuits.json")
  }
};

/**
 * Test-relevant GPC family selector. Sets the circuit parameter family to that
 * specified by the environment variable `GPC_FAMILY_VARIANT`.
 *
 * @returns an object containing the name of the specified circuit family as
 * well as the circuit descriptions furnished by this family
 * @throws Error if an invalid family is specified
 */
export function chooseCircuitFamilyForTests(): {
  circuitParamType: string;
  testCircuitFamily: ProtoPODGPCCircuitDesc[];
} {
  const familyType = env["GPC_FAMILY_VARIANT"];
  const circuitParamType = ensureCircuitParamSet(familyType ?? "test");
  const testCircuitParams: [ProtoPODGPCCircuitParams, number][] = JSON.parse(
    fsReadFile(JSON_FILE_CONFIG[circuitParamType].circuitParamJsonFile, {
      encoding: "utf8"
    })
  ) as [ProtoPODGPCCircuitParams, number][];
  return {
    circuitParamType,
    testCircuitFamily: ProtoPODGPC.circuitFamilyFromParams(testCircuitParams)
  };
}

/**
 * Ensures that the type of the set of circuit parameters (if provided) is
 * valid.  At present, this amounts to checking for either "prod" or "test".
 *
 * @param name optional string identifying the set of circuit parameters
 * @returns string identifying the set of circuit parameters ("prod" if
 * unspecified).
 * @throws Error if the circuit parameter family set specified is inadmissible.
 */
export function ensureCircuitParamSet(name: string | undefined): string {
  const admissibleParamSets = Object.keys(JSON_FILE_CONFIG);
  if (name && !admissibleParamSets.includes(name)) {
    throw new Error(
      `Circuit parameters must be one of the following types: ${admissibleParamSets}`
    );
  } else {
    return name ?? "prod";
  }
}
