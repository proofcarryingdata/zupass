import circomkitJson from "../circomkit.json";
import { Circomkit } from "circomkit";
import * as fs from "fs";
import * as path from "path";
import { batchPromise, maxParallelPromises } from "../src/util";

const artifactDir = "artifacts";
const testArtifactDir = path.join(artifactDir, "test");

main = async (): Promise<void> => {
  // Delete old artifacts
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

  // Instantiate Circomkit object.
  const circomkit = new Circomkit(circomkitJson);

  // Set up circuits.
  await batchPromise(
    maxParallelPromises,
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

  console.log("gen-test-artifacts completed successfully!");
};

main()
  .then(() => process.exit())
  .catch((err) => {
    throw err;
  });
