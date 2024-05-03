import { Circomkit, CircomkitConfig } from "circomkit";
import { existsSync as fsExists } from "fs";
import * as fs from "fs/promises";
import * as path from "path";
import circomkitJson from "../circomkit.json";
import circuitsJson from "../circuits.json";
import { batchPromise } from "../src/util";
import { MAX_PARALLEL_PROMISES, clearDir } from "./util";

const projectDir = path.join(__dirname, "..");
const artifactDir = path.join(projectDir, "artifacts");
const testArtifactDir = path.join(artifactDir, "test");

async function main(): Promise<void> {
  // Delete old artifacts
  if (await fsExists(testArtifactDir)) {
    await clearDir(testArtifactDir);
  } else {
    await fs.mkdir(testArtifactDir, { recursive: true });
  }

  // Instantiate Circomkit object.
  const circomkit = new Circomkit(circomkitJson as Partial<CircomkitConfig>);

  // Read circuit names from circuits.json
  const circuitNames = Object.keys(circuitsJson);

  // Compile and set up circuits in parallel to generate all artifacts.
  // The batching lets us compile up to 4 circuits at a time to avoid OOM
  // issues.  The awaits within the lambda below ensures that compile and
  // setup of the same circuit happen in sequence.
  await batchPromise(
    MAX_PARALLEL_PROMISES,
    async (circuitName) => {
      // Note that setup will implicitly compile if r1cs file doesn't exist, but
      // it won't check if inputs have changed or other files (e.g. wasm) are
      // missing, so we do both steps explicitly here.
      await circomkit.compile(circuitName);
      await circomkit.setup(circuitName);
    },
    circuitNames
  );

  // Move artifacts to the right place.
  for (const circuitName of circuitNames) {
    await fs.copyFile(
      path.join("build", circuitName, "groth16_vkey.json"),
      path.join(testArtifactDir, circuitName + "-vkey.json")
    );
    await fs.copyFile(
      path.join("build", circuitName, "groth16_pkey.zkey"),
      path.join(testArtifactDir, circuitName + "-pkey.zkey")
    );
    await fs.copyFile(
      path.join(
        "build",
        circuitName,
        circuitName + "_js",
        circuitName + ".wasm"
      ),
      path.join(testArtifactDir, circuitName + ".wasm")
    );
  }

  console.log("gen-test-artifacts completed successfully!");
}

main()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
