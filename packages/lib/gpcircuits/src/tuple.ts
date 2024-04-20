import { CircuitSignal } from "./types";

export type TupleModuleInputs = {
    valueHash: CircuitSignal[];
    tupleIndices: CircuitSignal[][];
};

export type TupleModuleInputNamesType = [
  "valueHash",
  "tupleIndices"
];

export type TupleModuleOutputs = { tupleHash: CircuitSignal[] };

export type TupleModuleOutputNamesType = ["tupleHash"];
