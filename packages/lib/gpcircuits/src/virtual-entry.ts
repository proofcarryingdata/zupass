import { CircuitSignal } from "./types";

export type VirtualEntryModuleInputs = {
  isValueHashRevealed: CircuitSignal;
  objectContentID: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignerPubkeyAx: CircuitSignal /*MAX_OBJECTS*/[];
  objectSignerPubkeyAy: CircuitSignal /*MAX_OBJECTS*/[];
};

export type VirtualEntryModuleInputNamesType = [
  "isValueHashRevealed",
  "objectContentID",
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
