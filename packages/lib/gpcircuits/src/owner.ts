import { CircuitSignal } from "./types";

export type OwnerModuleSemaphoreV3Inputs = {
  enabled: CircuitSignal;
  identityNullifier: CircuitSignal;
  identityTrapdoor: CircuitSignal;
  identityCommitmentHash: CircuitSignal;
  externalNullifier: CircuitSignal;
  isNullfierHashRevealed: CircuitSignal;
};

export type OwnerModuleSemaphoreV3nputNamesType = [
  "enabled",
  "identityNullifier",
  "identityTrapdoor",
  "identityCommitmentHash",
  "externalNullifier",
  "isNullfierHashRevealed"
];

export type OwnerModuleSemaphoreV3Outputs = {
  revealedNullifierHash: CircuitSignal;
};

export type OwnerModuleSemaphoreV3OutputNamesType = ["revealedNullifierHash"];
