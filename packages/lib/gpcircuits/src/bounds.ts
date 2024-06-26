import { CircuitSignal } from "./types";

export type BoundsCheckModuleInputs = {
  comparisonValues: CircuitSignal /*MAX_BOUNDED_VALUES*/[];
  bounds: CircuitSignal /*MAX_BOUNDED_VALUES*/[] /*2*/[];
};

export type BoundsCheckModuleInputNamesType = ["comparisonValues", "bounds"];

export type BoundsCheckModuleOutputs = Record<string, never>;

export type BoundsCheckModuleOutputNamesType = [];

export type InIntervalInputs = {
  in: CircuitSignal;
  bounds: CircuitSignal /*2*/[];
};

export type InIntervalInputNamesType = ["in", "bounds"];

export type InIntervalOutputs = {
  out: CircuitSignal;
};

export type InIntervalOutputNamesType = ["out"];
