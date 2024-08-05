import { CircuitSignal } from "./types.js";

export type ObjectModuleInputs = {
  contentID: CircuitSignal;
  signerPubkeyAx: CircuitSignal;
  signerPubkeyAy: CircuitSignal;
  signatureR8x: CircuitSignal;
  signatureR8y: CircuitSignal;
  signatureS: CircuitSignal;
};

export type ObjectModuleInputNamesType = [
  "contentID",
  "signerPubkeyAx",
  "signerPubkeyAy",
  "signatureR8x",
  "signatureR8y",
  "signatureS"
];

export type ObjectModuleOutputs = Record<string, never>;

export type ObjectModuleOutputNamesType = [];
