import { CircuitSignal } from "./types";

export type TupleModuleInputs = {
    valueHash: CircuitSignal[];
    isValueEnabled: CircuitSignal[];
};

export type TupleModuleInputNamesType = [
  "valueHash",
  "isValueEnabled"
];

export type TupleModuleOutputs = { tupleHash: CircuitSignal };

export type TupleModuleOutputNamesType = ["tupleHash"];
