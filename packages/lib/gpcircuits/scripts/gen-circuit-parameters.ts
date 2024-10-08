import { argv } from "process";
import { ensureCircuitParamSet, jsonFileConfig } from "../src/util";
import { genCircuitParamConfig } from "./util";

async function main(): Promise<void> {
  const paramType = ensureCircuitParamSet(argv[2]);
  const { circuitParamGenJsonFile, circuitParamJsonFile, circuitsJsonFile } =
    jsonFileConfig[paramType];

  return genCircuitParamConfig(
    circuitParamGenJsonFile,
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
