import { CircuitSignal } from "./types";

export type TupleModuleInputs = {
  value: CircuitSignal[];
  tupleIndices: CircuitSignal[];
};

export type TupleModuleInputNamesType = ["value", "tupleIndices"];

export type TupleModuleOutputs = { tupleHash: CircuitSignal };

export type TupleModuleOutputNamesType = ["tupleHash"];
