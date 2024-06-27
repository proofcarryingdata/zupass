import { CircuitSignal } from "./types";

export type BoundsCheckModuleInputs = {
  comparisonValue: CircuitSignal;
  minValue: CircuitSignal;
  maxValue: CircuitSignal;
};

export type BoundsCheckModuleInputNamesType = [
  "comparisonValue",
  "minValue",
  "maxValue"
];

export type BoundsCheckModuleOutputs = Record<string, never>;

export type BoundsCheckModuleOutputNamesType = [];
