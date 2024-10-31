import * as path from "path";
import { argv } from "process";
import {
  ARTIFACTS_DIR,
  JSON_FILE_CONFIG,
  ensureCircuitParamSet,
  genCircuitArtifacts
} from "./common";

async function main(): Promise<void> {
  const artifactType = ensureCircuitParamSet(argv[2]);
  const { circuitsJsonFile } = JSON_FILE_CONFIG[artifactType];
  const artifactDir = path.join(ARTIFACTS_DIR, artifactType);

  return genCircuitArtifacts(circuitsJsonFile, artifactDir).then(() =>
    console.log("gen-artifacts completed successfully!")
  );
}

main()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
