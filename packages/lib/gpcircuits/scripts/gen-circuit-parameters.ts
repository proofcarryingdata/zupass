import { argv } from "process";
import {
  JSON_FILE_CONFIG,
  ensureCircuitParamSet,
  genCircuitParamConfig
} from "./common";

async function main(): Promise<void> {
  const paramType = ensureCircuitParamSet(argv[2]);
  const { circuitParams, circuitParamJsonFile, circuitsJsonFile } =
    JSON_FILE_CONFIG[paramType];

  return genCircuitParamConfig(
    circuitParams,
    circuitParamJsonFile,
    circuitsJsonFile
  ).then(() => console.log("gen-circuit-parameters completed successfully!"));
}

main()
  .then(() => process.exit())
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
