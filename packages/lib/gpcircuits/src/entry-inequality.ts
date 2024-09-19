import { CircuitSignal } from "./types";

export type EntryInequalityModuleInputs = {
  value: CircuitSignal;
  otherValue: CircuitSignal;
};

export type EntryInequalityModuleInputNamesType = [
  "value",
  "otherValue"
];

export type EntryInequalityModuleOutputs = { out: CircuitSignal };

export type EntryInequalityModuleOutputNamesType = ["out"];
