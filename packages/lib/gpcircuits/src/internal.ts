import { readFileSync as fsReadFile } from "fs";
import path from "path";
import { env } from "process";
import {
  ProtoPODGPC,
  ProtoPODGPCCircuitDesc,
  ProtoPODGPCCircuitParams
} from "./proto-pod-gpc";
import { ensureCircuitParamSet } from "./util";

/**
 * Constants specifying locations of files and directories relevant to circuit
 * parameter and artifact generation.
 */
const PROJECT_DIR = path.join(__dirname, "..");
export const ARTIFACTS_DIR = path.join(PROJECT_DIR, "artifacts");
export const CIRCUIT_DIR = path.join(PROJECT_DIR, "circuits", "main");
const PARAM_DIR = path.join(PROJECT_DIR, "scripts", "parameters");
export const JSON_FILE_CONFIG: Record<string, Record<string, string>> = {
  prod: {
    circuitParamGenJsonFile: path.join(PARAM_DIR, "paramGen.json"),
    circuitParamJsonFile: path.join(
      PROJECT_DIR,
      "src",
      "circuitParameters.json"
    ),
    circuitsJsonFile: path.join(PROJECT_DIR, "circuits.json")
  },
  test: {
    circuitParamGenJsonFile: path.join(PARAM_DIR, "testParamGen.json"),
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
export function chooseCircuitFamily(): {
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
