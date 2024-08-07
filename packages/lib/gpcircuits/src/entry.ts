import { CircuitSignal } from "./types";

export type EntryModuleInputs = {
  objectContentID: CircuitSignal;
  nameHash: CircuitSignal;
  isValueHashRevealed: CircuitSignal;
  proofDepth: CircuitSignal;
  proofIndex: CircuitSignal;
  proofSiblings: CircuitSignal[];
};

export type EntryModuleInputNamesType = [
  "objectContentID",
  "nameHash",
  "isValueHashRevealed",
  "proofDepth",
  "proofIndex",
  "proofSiblings"
];

export type EntryModuleOutputs = { revealedValueHash: CircuitSignal };

export type EntryModuleOutputNamesType = ["revealedValueHash"];

export type EntryConstraintModuleInputs = {
  valueHash: CircuitSignal;
  entryValueHashes: CircuitSignal[];
  equalToOtherEntryByIndex: CircuitSignal;
};

export type EntryConstraintModuleInputNamesType = [
  "valueHash",
  "entryValueHashes",
  "equalToOtherEntryByIndex"
];

export type EntryConstraintModuleOutputs = Record<string, never>;

export type EntryConstraintModuleOutputNamesType = [];
