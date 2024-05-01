import circomkitJson from "../circomkit.json";
import { Circomkit } from "circomkit";
import circuitsJson from "../circuits.json";
import * as fs from "fs/promises";
import { existsSync as fsExists } from "fs";
import * as path from "path";
import { batchPromise, clearDir, maxParallelPromises } from "../src/util";

const artifactDir = "artifacts";
const testArtifactDir = path.join(artifactDir, "test");

main = async (): Promise<void> => {
  // Delete old artifacts
  if (await fsExists(testArtifactDir)) {
    await clearDir(testArtifactDir);
  } else {
    await fs.mkdir(testArtifactDir);
  }

  // Instantiate Circomkit object.
  const circomkit = new Circomkit(circomkitJson);

  // Read circuit names from circuits.json
  const circuitNames = Object.keys(circuitsJson);

  // Set up circuits.
  await batchPromise(
    maxParallelPromises,
    (circuitName) => circomkit.setup(circuitName),
    circuitNames
  );

  // Move artifacts to the right place.
  for (const circuitName of circuitNames) {
    await fs.rename(
      path.join("build", circuitName, "groth16_vkey.json"),
      path.join(testArtifactDir, circuitName + "-vkey.json")
    );
    await fs.rename(
      path.join("build", circuitName, "groth16_pkey.zkey"),
      path.join(testArtifactDir, circuitName + "-pkey.zkey")
    );
    await fs.rename(
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
};

main()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
  });
