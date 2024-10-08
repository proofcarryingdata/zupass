import * as path from "path";
import { argv } from "process";
import {
  artifactsDir,
  ensureCircuitParamSet,
  jsonFileConfig
} from "../src/util";
import { genCircuitArtifacts } from "./util";

async function main(): Promise<void> {
  const artifactType = ensureCircuitParamSet(argv[2]);
  const { circuitsJsonFile } = jsonFileConfig[artifactType];
  const artifactDir = path.join(artifactsDir, artifactType);

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
