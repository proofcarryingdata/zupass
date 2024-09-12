import { CircuitSignal } from "./types";

export type UniquenessModuleInputs = {
  values: CircuitSignal[];
};

export type UniquenessModuleInputNamesType = [
  "values"
];

export type UniquenessModuleOutputs = {
  valuesAreUnique: CircuitSignal;
};

export type UniquenessModuleOutputNamesType = ["valuesAreUnique"];
