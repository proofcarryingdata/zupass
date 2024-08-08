import { CircuitSignal } from "./types";

export type NumericValueModuleInputs = {
  isEnabled: CircuitSignal;
  numericValue: CircuitSignal;
  extractedValueHash: CircuitSignal;
  minValue: CircuitSignal;
  maxValue: CircuitSignal;
};

export type NumericValueModuleInputNamesType = [
  "isEnabled",
  "numericValue",
  "extractedValueHash",
  "minValue",
  "maxValue"
];

export type NumericValueModuleOutputs = {
  boundsCheck: CircuitSignal;
};

export type NumericValueModuleOutputNamesType = ["boundsCheck"];
