import { CircuitSignal } from "./types";

export type EntryInequalityModuleInputs = {
  value: CircuitSignal;
  otherValue: CircuitSignal;
};

export type EntryInequalityModuleInputNamesType = ["value", "otherValue"];

export type EntryInequalityModuleOutputs = { isLessThan: CircuitSignal };

export type EntryInequalityModuleOutputNamesType = ["isLessThan"];
