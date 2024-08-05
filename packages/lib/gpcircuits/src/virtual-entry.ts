import { CircuitSignal } from "./types.js";

export type VirtualEntryModuleInputs = {
  isValueHashRevealed: CircuitSignal;
  objectSignerPubkeyAx: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignerPubkeyAy: CircuitSignal /*MAX_OBJECTS*/[];
};

export type VirtualEntryModuleInputNamesType = [
  "isValueHashRevealed",
  "objectSignerPubkeyAx",
  "objectSignerPubkeyAy"
];

export type VirtualEntryModuleOutputs = {
  valueHashes: CircuitSignal /*MAX_VIRTUAL_ENTRIES*/[];
  revealedValueHash: CircuitSignal /*MAX_VIRTUAL_ENTRIES*/[];
};

export type VirtualEntryModuleOutputNamesType = [
  "valueHashes",
  "revealedValueHash"
];
