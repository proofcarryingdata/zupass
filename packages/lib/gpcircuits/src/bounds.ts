import { CircuitSignal } from "./types.js";

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

export type BoundsCheckModuleOutputs = { out: CircuitSignal };

export type BoundsCheckModuleOutputNamesType = ["out"];
